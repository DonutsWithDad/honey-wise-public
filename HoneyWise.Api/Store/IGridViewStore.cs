using System.Text.Json;
using HoneyWise.Contracts;
using Npgsql;
using NpgsqlTypes;

namespace HoneyWise.Api.Store;

/// <summary>
/// Externally facing contract for persisting <see cref="GridView"/> data. Every
/// operation is scoped to the owning user's id so a caller can only ever see or
/// mutate their own views.
/// </summary>
public interface IGridViewStore
{
    /// <summary>The user's views for one grid, ordered by name.</summary>
    Task<IReadOnlyList<GridView>> GetViews(Guid userId, string gridKey);

    /// <summary>
    /// Returns true if the user already has a view with this name (ignoring case)
    /// on the grid, other than <paramref name="excludeId"/>.
    /// </summary>
    Task<bool> NameExists(Guid userId, string gridKey, string name, Guid excludeId);

    /// <summary>
    /// Inserts a new view. If it is the default, the grid's previous default is
    /// cleared in the same transaction.
    /// </summary>
    Task CreateView(Guid userId, GridView view);

    /// <summary>
    /// Updates a view owned by <paramref name="userId"/> on the view's grid.
    /// Returns <c>false</c> if no such view exists for that user.
    /// </summary>
    Task<bool> UpdateView(Guid userId, GridView view);

    /// <summary>Deletes a view owned by <paramref name="userId"/>. Returns <c>true</c> if a row was removed.</summary>
    Task<bool> DeleteView(Guid userId, Guid viewId);
}

/// <summary>
/// Concrete store that talks directly to Postgres, mirroring <see cref="RecipeStore"/>.
/// Each view is a row in <c>"Tool"."GridView"</c> with its state in a jsonb column.
/// </summary>
public class GridViewStore : IGridViewStore
{
    private readonly IConfiguration _configuration;

    public GridViewStore(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    private string ConnectionString =>
        _configuration["HoneyWiseConnection"]
            ?? throw new InvalidOperationException("Missing 'HoneyWiseConnection' connection string.");

    public async Task<IReadOnlyList<GridView>> GetViews(Guid userId, string gridKey)
    {
        const string sql = """
            SELECT "Id", "GridKey", "Name", "State"::text, "IsDefault", "CreatedAt", "UpdatedAt"
            FROM "Tool"."GridView"
            WHERE "UserId" = @UserId AND "GridKey" = @GridKey
            ORDER BY lower("Name");
            """;

        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("@UserId", userId);
        command.Parameters.AddWithValue("@GridKey", gridKey);

        var views = new List<GridView>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            using var state = JsonDocument.Parse(reader.GetString(3));

            views.Add(new GridView
            {
                Id = reader.GetGuid(0),
                GridKey = reader.GetString(1),
                Name = reader.GetString(2),
                State = state.RootElement.Clone(),
                IsDefault = reader.GetBoolean(4),
                CreatedAt = reader.GetDateTime(5),
                UpdatedAt = reader.GetDateTime(6),
            });
        }

        return views;
    }

    public async Task<bool> NameExists(Guid userId, string gridKey, string name, Guid excludeId)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1 FROM "Tool"."GridView"
                WHERE "UserId" = @UserId AND "GridKey" = @GridKey
                  AND lower("Name") = lower(@Name) AND "Id" <> @ExcludeId
            );
            """;

        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("@UserId", userId);
        command.Parameters.AddWithValue("@GridKey", gridKey);
        command.Parameters.AddWithValue("@Name", name);
        command.Parameters.AddWithValue("@ExcludeId", excludeId);

        return (bool)(await command.ExecuteScalarAsync() ?? false);
    }

    public async Task CreateView(Guid userId, GridView view)
    {
        const string sql = """
            INSERT INTO "Tool"."GridView"
                ("Id", "UserId", "GridKey", "Name", "State", "IsDefault", "CreatedAt", "UpdatedAt")
            VALUES
                (@Id, @UserId, @GridKey, @Name, @State, @IsDefault, @CreatedAt, @UpdatedAt);
            """;

        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();

        if (view.IsDefault)
        {
            await ClearDefault(connection, transaction, userId, view.GridKey, view.Id);
        }

        await using var command = new NpgsqlCommand(sql, connection, transaction);
        command.Parameters.AddWithValue("@Id", view.Id);
        command.Parameters.AddWithValue("@UserId", userId);
        command.Parameters.AddWithValue("@GridKey", view.GridKey);
        command.Parameters.AddWithValue("@Name", view.Name);
        command.Parameters.Add(StateParameter(view.State));
        command.Parameters.AddWithValue("@IsDefault", view.IsDefault);
        command.Parameters.AddWithValue("@CreatedAt", view.CreatedAt);
        command.Parameters.AddWithValue("@UpdatedAt", view.UpdatedAt);
        await command.ExecuteNonQueryAsync();

        await transaction.CommitAsync();
    }

    public async Task<bool> UpdateView(Guid userId, GridView view)
    {
        // Scoped to owner and grid, so a user can never overwrite another's view
        // (or move a view between grids) even by guessing an id.
        const string sql = """
            UPDATE "Tool"."GridView"
            SET "Name" = @Name, "State" = @State, "IsDefault" = @IsDefault, "UpdatedAt" = @UpdatedAt
            WHERE "Id" = @Id AND "UserId" = @UserId AND "GridKey" = @GridKey;
            """;

        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();

        if (view.IsDefault)
        {
            await ClearDefault(connection, transaction, userId, view.GridKey, view.Id);
        }

        await using var command = new NpgsqlCommand(sql, connection, transaction);
        command.Parameters.AddWithValue("@Id", view.Id);
        command.Parameters.AddWithValue("@UserId", userId);
        command.Parameters.AddWithValue("@GridKey", view.GridKey);
        command.Parameters.AddWithValue("@Name", view.Name);
        command.Parameters.Add(StateParameter(view.State));
        command.Parameters.AddWithValue("@IsDefault", view.IsDefault);
        command.Parameters.AddWithValue("@UpdatedAt", view.UpdatedAt);

        var rows = await command.ExecuteNonQueryAsync();
        if (rows == 0)
        {
            // Unknown id: roll back so the default we may have cleared stays put.
            await transaction.RollbackAsync();
            return false;
        }

        await transaction.CommitAsync();
        return true;
    }

    public async Task<bool> DeleteView(Guid userId, Guid viewId)
    {
        const string sql = """
            DELETE FROM "Tool"."GridView"
            WHERE "Id" = @Id AND "UserId" = @UserId;
            """;

        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", viewId);
        command.Parameters.AddWithValue("@UserId", userId);

        var rows = await command.ExecuteNonQueryAsync();
        return rows > 0;
    }

    /// <summary>Unsets the grid's current default view, except <paramref name="keepId"/>.</summary>
    private static async Task ClearDefault(
        NpgsqlConnection connection, NpgsqlTransaction transaction, Guid userId, string gridKey, Guid keepId)
    {
        const string sql = """
            UPDATE "Tool"."GridView"
            SET "IsDefault" = false
            WHERE "UserId" = @UserId AND "GridKey" = @GridKey AND "IsDefault" AND "Id" <> @KeepId;
            """;

        await using var command = new NpgsqlCommand(sql, connection, transaction);
        command.Parameters.AddWithValue("@UserId", userId);
        command.Parameters.AddWithValue("@GridKey", gridKey);
        command.Parameters.AddWithValue("@KeepId", keepId);
        await command.ExecuteNonQueryAsync();
    }

    private static NpgsqlParameter StateParameter(JsonElement state) =>
        new("@State", NpgsqlDbType.Jsonb) { Value = state.GetRawText() };
}
