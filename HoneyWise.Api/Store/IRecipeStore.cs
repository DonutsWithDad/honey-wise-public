using Mead.Tools;
using HoneyWise.Utils;
using Npgsql;
using NpgsqlTypes;

namespace HoneyWise.Api.Store;

/// <summary>
/// Externally facing contract for persisting <see cref="Recipe"/> data. Every
/// operation is scoped to the owning user's id so a caller can only ever see or
/// mutate their own recipes. Command handlers depend on this interface, never on
/// the concrete store.
/// </summary>
public interface IRecipeStore
{
    /// <summary>Inserts a new recipe row for <paramref name="userId"/>.</summary>
    Task CreateRecipe(Guid userId, Recipe recipe);

    /// <summary>
    /// Updates an existing recipe owned by <paramref name="userId"/>. Returns
    /// <c>true</c> if a row was updated, <c>false</c> if no matching recipe exists
    /// for that user (unknown id, or owned by someone else).
    /// </summary>
    Task<bool> UpdateRecipe(Guid userId, Recipe recipe);

    /// <summary>
    /// Deletes a recipe owned by <paramref name="userId"/>. Returns <c>true</c> if
    /// a row was removed.
    /// </summary>
    Task<bool> DeleteRecipe(Guid userId, Guid recipeId);

    /// <summary>Lightweight list of the user's recipes, newest-updated first.</summary>
    Task<IReadOnlyList<RecipeSummary>> GetRecipes(Guid userId);

    /// <summary>The full recipe, or <c>null</c> if not found / not owned by the user.</summary>
    Task<Recipe?> GetRecipe(Guid userId, Guid recipeId);

    /// <summary>The stored XML document for export, or <c>null</c> if not found / not owned.</summary>
    Task<string?> GetRecipeXml(Guid userId, Guid recipeId);
}

/// <summary>
/// Concrete store that talks directly to Postgres, mirroring <see cref="UserStore"/>.
/// Each recipe is a single row in <c>"Tool"."Recipe"</c> whose <c>"Document"</c>
/// column holds the recipe serialized as XML; <c>"UserId"</c> links it to its owner.
/// </summary>
public class RecipeStore : IRecipeStore
{
    private readonly IConfiguration _configuration;

    public RecipeStore(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    private string ConnectionString =>
        _configuration["HoneyWiseConnection"]
            ?? throw new InvalidOperationException("Missing 'HoneyWiseConnection' connection string.");

    public async Task CreateRecipe(Guid userId, Recipe recipe)
    {
        const string sql = """
            INSERT INTO "Tool"."Recipe"
                ("Id", "UserId", "Name", "Document", "CreatedAt", "UpdatedAt")
            VALUES
                (@Id, @UserId, @Name, @Document, @CreatedAt, @UpdatedAt);
            """;

        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", recipe.Id);
        command.Parameters.AddWithValue("@UserId", userId);
        command.Parameters.AddWithValue("@Name", recipe.Name);
        command.Parameters.Add(new NpgsqlParameter("@Document", NpgsqlDbType.Xml)
        {
            Value = RecipeXmlSerializer.Serialize(recipe),
        });
        command.Parameters.AddWithValue("@CreatedAt", recipe.CreatedAt);
        command.Parameters.AddWithValue("@UpdatedAt", recipe.UpdatedAt);

        await command.ExecuteNonQueryAsync();
    }

    public async Task<bool> UpdateRecipe(Guid userId, Recipe recipe)
    {
        // The WHERE clause scopes the update to the owner, so one user can never
        // overwrite another's recipe even by guessing an id.
        const string sql = """
            UPDATE "Tool"."Recipe"
            SET "Name" = @Name, "Document" = @Document, "UpdatedAt" = @UpdatedAt
            WHERE "Id" = @Id AND "UserId" = @UserId;
            """;

        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", recipe.Id);
        command.Parameters.AddWithValue("@UserId", userId);
        command.Parameters.AddWithValue("@Name", recipe.Name);
        command.Parameters.Add(new NpgsqlParameter("@Document", NpgsqlDbType.Xml)
        {
            Value = RecipeXmlSerializer.Serialize(recipe),
        });
        command.Parameters.AddWithValue("@UpdatedAt", recipe.UpdatedAt);

        var rows = await command.ExecuteNonQueryAsync();
        return rows > 0;
    }

    public async Task<bool> DeleteRecipe(Guid userId, Guid recipeId)
    {
        const string sql = """
            DELETE FROM "Tool"."Recipe"
            WHERE "Id" = @Id AND "UserId" = @UserId;
            """;

        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", recipeId);
        command.Parameters.AddWithValue("@UserId", userId);

        var rows = await command.ExecuteNonQueryAsync();
        return rows > 0;
    }

    public async Task<IReadOnlyList<RecipeSummary>> GetRecipes(Guid userId)
    {
        // The Document holds the ingredients the client filters on, so it is
        // pulled and deserialized here rather than forcing a per-recipe fetch.
        const string sql = """
            SELECT "Id", "Name", "UpdatedAt", "Document"::text
            FROM "Tool"."Recipe"
            WHERE "UserId" = @UserId
            ORDER BY "UpdatedAt" DESC;
            """;

        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("@UserId", userId);

        var summaries = new List<RecipeSummary>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var ingredients = reader.IsDBNull(3)
                ? new List<RecipeIngredient>()
                : RecipeXmlSerializer.Deserialize(reader.GetString(3)).Ingredients;

            summaries.Add(new RecipeSummary
            {
                Id = reader.GetGuid(0),
                Name = reader.GetString(1),
                UpdatedAt = reader.GetDateTime(2),
                Ingredients = ingredients,
            });
        }

        return summaries;
    }

    public async Task<Recipe?> GetRecipe(Guid userId, Guid recipeId)
    {
        var xml = await GetRecipeXml(userId, recipeId);
        return xml is null ? null : RecipeXmlSerializer.Deserialize(xml);
    }

    public async Task<string?> GetRecipeXml(Guid userId, Guid recipeId)
    {
        const string sql = """
            SELECT "Document"::text
            FROM "Tool"."Recipe"
            WHERE "Id" = @Id AND "UserId" = @UserId;
            """;

        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", recipeId);
        command.Parameters.AddWithValue("@UserId", userId);

        await using var reader = await command.ExecuteReaderAsync();
        return await reader.ReadAsync() ? reader.GetString(0) : null;
    }
}
