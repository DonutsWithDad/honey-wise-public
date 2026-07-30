using Mead.Tools;
using HoneyWise.Api.Store;
using MediatR;

namespace HoneyWise.Api.Controllers.Recipes;

/// <summary>
/// Lists the calling user's recipes as lightweight summaries.
/// </summary>
public class GetRecipesQuery : IRequest<IReadOnlyList<RecipeSummary>>
{
    /// <summary>Owning user's id, resolved from the authenticated principal.</summary>
    public Guid UserId { get; set; }
}

public class GetRecipesQueryHandler : IRequestHandler<GetRecipesQuery, IReadOnlyList<RecipeSummary>>
{
    private readonly IRecipeStore _recipeStore;

    public GetRecipesQueryHandler(IRecipeStore recipeStore)
    {
        _recipeStore = recipeStore;
    }

    public Task<IReadOnlyList<RecipeSummary>> Handle(GetRecipesQuery request, CancellationToken cancellationToken)
    {
        return _recipeStore.GetRecipes(request.UserId);
    }
}
