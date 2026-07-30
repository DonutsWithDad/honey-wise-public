using HoneyWise.Api.Store;
using MediatR;

namespace HoneyWise.Api.Controllers.Recipes;

/// <summary>
/// Returns the stored XML document for a recipe owned by the caller, ready to be
/// served as a downloadable file. <c>null</c> when the recipe doesn't exist or
/// isn't owned by the user.
/// </summary>
public class ExportRecipeQuery : IRequest<ExportRecipeResult?>
{
    /// <summary>Id of the recipe to export (from the route).</summary>
    public Guid RecipeId { get; set; }

    /// <summary>Owning user's id, resolved from the authenticated principal.</summary>
    public Guid UserId { get; set; }
}

/// <summary>The recipe's display name plus its raw XML, for building the download.</summary>
public record ExportRecipeResult(string Name, string Xml);

public class ExportRecipeQueryHandler : IRequestHandler<ExportRecipeQuery, ExportRecipeResult?>
{
    private readonly IRecipeStore _recipeStore;

    public ExportRecipeQueryHandler(IRecipeStore recipeStore)
    {
        _recipeStore = recipeStore;
    }

    public async Task<ExportRecipeResult?> Handle(ExportRecipeQuery request, CancellationToken cancellationToken)
    {
        // Load the full recipe (not just the XML) so we have the name for the
        // download filename; the store deserializes from the same stored document.
        var recipe = await _recipeStore.GetRecipe(request.UserId, request.RecipeId);
        if (recipe is null)
        {
            return null;
        }

        var xml = await _recipeStore.GetRecipeXml(request.UserId, request.RecipeId);
        return xml is null ? null : new ExportRecipeResult(recipe.Name, xml);
    }
}
