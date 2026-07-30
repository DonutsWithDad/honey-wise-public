using Mead.Tools;
using HoneyWise.Api.Store;
using MediatR;

namespace HoneyWise.Api.Controllers.Ingredients;

/// <summary>
/// Returns the curated ingredient presets, shaped for the recipe form: dedicated
/// lists for the three required core selects plus the full set grouped by category
/// for the "additional ingredient" pickers.
/// </summary>
public class GetIngredientPresetsQuery : IRequest<IngredientPresetsResponse>
{
}

public class IngredientPresetsResponse
{
    /// <summary>Preset names in the Honey category.</summary>
    public List<string> HoneyTypes { get; set; } = new();

    /// <summary>Preset names in the Water category.</summary>
    public List<string> WaterTypes { get; set; } = new();

    /// <summary>Preset names in the Yeast category.</summary>
    public List<string> YeastTypes { get; set; } = new();

    /// <summary>All distinct categories (for the additional-ingredient category dropdown).</summary>
    public List<string> Categories { get; set; } = new();

    /// <summary>Every preset name grouped by its category.</summary>
    public Dictionary<string, List<string>> PresetsByCategory { get; set; } = new();
}

public class GetIngredientPresetsQueryHandler
    : IRequestHandler<GetIngredientPresetsQuery, IngredientPresetsResponse>
{
    private readonly IIngredientPresetStore _presetStore;

    public GetIngredientPresetsQueryHandler(IIngredientPresetStore presetStore)
    {
        _presetStore = presetStore;
    }

    public async Task<IngredientPresetsResponse> Handle(
        GetIngredientPresetsQuery request, CancellationToken cancellationToken)
    {
        IReadOnlyList<IngredientPreset> presets = await _presetStore.GetPresets();

        var byCategory = presets
            .GroupBy(p => p.Category, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.Select(p => p.Name).ToList());

        List<string> ForCategory(string category) =>
            byCategory.TryGetValue(category, out var names) ? names : new List<string>();

        return new IngredientPresetsResponse
        {
            HoneyTypes = ForCategory("Honey"),
            WaterTypes = ForCategory("Water"),
            YeastTypes = ForCategory("Yeast"),
            Categories = byCategory.Keys.OrderBy(k => k).ToList(),
            PresetsByCategory = byCategory,
        };
    }
}
