using Mead.Tools;
using HoneyWise.Api.Store;
using MediatR;

namespace HoneyWise.Api.Controllers.Recipes;

/// <summary>
/// Fetches a single full recipe owned by the caller, or <c>null</c> if it doesn't
/// exist or belongs to someone else (the controller turns null into a 404).
/// </summary>
public class GetRecipeQuery : IRequest<Recipe?>
{
    /// <summary>Id of the recipe to fetch (from the route).</summary>
    public Guid RecipeId { get; set; }

    /// <summary>Owning user's id, resolved from the authenticated principal.</summary>
    public Guid UserId { get; set; }
}

public class GetRecipeQueryHandler : IRequestHandler<GetRecipeQuery, Recipe?>
{
    private readonly IRecipeStore _recipeStore;

    public GetRecipeQueryHandler(IRecipeStore recipeStore)
    {
        _recipeStore = recipeStore;
    }

    public Task<Recipe?> Handle(GetRecipeQuery request, CancellationToken cancellationToken)
    {
        return _recipeStore.GetRecipe(request.UserId, request.RecipeId);
    }
}
