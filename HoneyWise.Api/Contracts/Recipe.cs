using System.Xml.Serialization;

namespace Mead.Tools;

/// <summary>
/// A user's mead recipe. The shape is deliberately open: beyond the required
/// Honey, Water and Yeast, a recipe carries an arbitrary flat list of
/// ingredients (spices, fruits, nutrients, stabilizers, ...) plus ordered
/// free-text directions. The whole document is serialized to XML for storage
/// and export (see <c>Utils/RecipeXmlSerializer</c>).
/// </summary>
[XmlRoot("Recipe")]
public class Recipe
{
    /// <summary>
    /// Id
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Owning user's Id. Server-owned; never trusted from the caller.
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// Name
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Description
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Every ingredient in the recipe, including the required Honey, Water and
    /// Yeast (each just an entry with the matching <see cref="RecipeIngredient.Category"/>).
    /// </summary>
    [XmlArray("Ingredients")]
    [XmlArrayItem("Ingredient")]
    public List<RecipeIngredient> Ingredients { get; set; } = new();

    /// <summary>
    /// Ordered directions for making the mead.
    /// </summary>
    [XmlArray("Steps")]
    [XmlArrayItem("Step")]
    public List<RecipeStep> Steps { get; set; } = new();

    /// <summary>
    /// Created At (UTC)
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Updated At (UTC)
    /// </summary>
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// A single ingredient. Free-form by design so users can capture anything the
/// preset lists don't cover.
/// </summary>
public class RecipeIngredient
{
    /// <summary>
    /// Name, e.g. "Orange Blossom", "Spring", "Lalvin D47", "Cinnamon".
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Category, e.g. Honey | Water | Yeast | Spice | Fruit | Nutrient | Stabilizer | Other.
    /// </summary>
    public string Category { get; set; } = string.Empty;

    /// <summary>
    /// Free-text amount, e.g. "3 lb", "1 gallon", "1 tsp".
    /// </summary>
    public string Quantity { get; set; } = string.Empty;
}

/// <summary>
/// A single ordered direction step, entered as plain text.
/// </summary>
public class RecipeStep
{
    /// <summary>
    /// 1-based position of this step in the directions.
    /// </summary>
    public int Order { get; set; }

    /// <summary>
    /// Plain-text instruction for this step.
    /// </summary>
    public string Text { get; set; } = string.Empty;
}

/// <summary>
/// Projection for the recipe list view. Carries the header fields plus the flat
/// ingredient list so the client can search and filter (by name, honey type,
/// yeast type, or any contained ingredient) without fetching each full document.
/// The heavier fields (description, steps) are still omitted.
/// </summary>
public class RecipeSummary
{
    /// <summary>
    /// Id
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Name
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Every ingredient in the recipe, including the required Honey, Water and
    /// Yeast. Used client-side for filtering; see <see cref="RecipeIngredient.Category"/>.
    /// </summary>
    public List<RecipeIngredient> Ingredients { get; set; } = new();

    /// <summary>
    /// Updated At (UTC)
    /// </summary>
    public DateTime UpdatedAt { get; set; }
}
