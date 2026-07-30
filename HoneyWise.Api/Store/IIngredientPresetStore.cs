using Mead.Tools;
using Npgsql;

namespace HoneyWise.Api.Store;

/// <summary>
/// Read-only access to the curated ingredient preset list. Presets are the same
/// for every user, so nothing here is user-scoped.
/// </summary>
public interface IIngredientPresetStore
{
    /// <summary>All presets, ordered by category then the configured sort order.</summary>
    Task<IReadOnlyList<IngredientPreset>> GetPresets();
}

/// <summary>
/// Concrete store reading presets from <c>"Tool"."IngredientPreset"</c> via raw
/// Npgsql, mirroring <see cref="UserStore"/>.
/// </summary>
public class IngredientPresetStore : IIngredientPresetStore
{
    private readonly IConfiguration _configuration;

    public IngredientPresetStore(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task<IReadOnlyList<IngredientPreset>> GetPresets()
    {
        var connectionString = _configuration["HoneyWiseConnection"]
            ?? throw new InvalidOperationException("Missing 'HoneyWiseConnection' connection string.");

        const string sql = """
            SELECT "Category", "Name"
            FROM "Tool"."IngredientPreset"
            ORDER BY "Category", "SortOrder", "Name";
            """;

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(sql, connection);

        var presets = new List<IngredientPreset>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            presets.Add(new IngredientPreset
            {
                Category = reader.GetString(0),
                Name = reader.GetString(1),
            });
        }

        return presets;
    }
}
