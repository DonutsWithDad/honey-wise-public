using Mead.Tools;

namespace HoneyWise.Api.Controllers.Recipes;

/// <summary>
/// Shared input validation for creating and updating a recipe. Kept in one place
/// so create and update enforce the same rules.
/// </summary>
internal static class RecipeValidation
{
    // The three ingredient categories every mead recipe must include.
    private static readonly string[] RequiredCategories = { "Honey", "Water", "Yeast" };

    /// <summary>
    /// Returns an error message if the recipe is invalid, or <c>null</c> if it's
    /// good to persist.
    /// </summary>
    public static string? Validate(Recipe recipe)
    {
        if (recipe is null)
        {
            return "Recipe is required. ";
        }

        if (string.IsNullOrWhiteSpace(recipe.Name))
        {
            return "Name is required. ";
        }

        foreach (var category in RequiredCategories)
        {
            var ingredient = recipe.Ingredients.FirstOrDefault(i =>
                string.Equals(i.Category, category, StringComparison.OrdinalIgnoreCase));

            if (ingredient is null || string.IsNullOrWhiteSpace(ingredient.Name))
            {
                return $"{category} is required. ";
            }
        }

        if (recipe.BatchSize < 0)
        {
            return "Batch size cannot be negative. ";
        }

        if (recipe.Steps.Any(s => s.TimerMinutes < 0))
        {
            return "Step timers cannot be negative. ";
        }

        return null;
    }
}
