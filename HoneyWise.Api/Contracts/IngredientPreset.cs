namespace Mead.Tools;

/// <summary>
/// A curated ingredient choice offered to users when building a recipe (e.g.
/// "Orange Blossom" honey, "Lalvin D47" yeast, "Cinnamon" spice). Stored in the
/// database so the lists can grow without a redeploy; users can still add fully
/// custom ingredients that aren't in these lists.
/// </summary>
public class IngredientPreset
{
    /// <summary>
    /// Category, e.g. Honey | Water | Yeast | Spice | Fruit | Nutrient | Stabilizer | Other.
    /// </summary>
    public string Category { get; set; } = string.Empty;

    /// <summary>
    /// Name of the preset ingredient.
    /// </summary>
    public string Name { get; set; } = string.Empty;
}
