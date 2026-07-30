using Mead.Tools;
using HoneyWise.Api.Store;
using HoneyWise.Contracts;
using MediatR;

namespace HoneyWise.Api.Controllers.Recipes;

/// <summary>
/// Request to update an existing recipe owned by the caller. The route id wins
/// over anything in the body, and ownership is enforced by the store.
/// </summary>
public class UpdateRecipeCommand : IRequest<UpdateRecipeResponse>
{
    /// <summary>Id of the recipe to update (from the route).</summary>
    public Guid RecipeId { get; set; }

    /// <summary>Recipe values supplied by the caller.</summary>
    public Recipe Recipe { get; set; } = new();

    /// <summary>Owning user's id, resolved from the authenticated principal.</summary>
    public Guid UserId { get; set; }
}

public class UpdateRecipeResponse : GenericResponse
{
    /// <summary>True when no recipe with that id exists for this user (→ 404).</summary>
    public bool NotFound { get; set; }
}

public class UpdateRecipeCommandHandler : IRequestHandler<UpdateRecipeCommand, UpdateRecipeResponse>
{
    private readonly IRecipeStore _recipeStore;
    private readonly ILogger<UpdateRecipeCommandHandler> _logger;

    public UpdateRecipeCommandHandler(IRecipeStore recipeStore, ILogger<UpdateRecipeCommandHandler> logger)
    {
        _recipeStore = recipeStore;
        _logger = logger;
    }

    public async Task<UpdateRecipeResponse> Handle(UpdateRecipeCommand request, CancellationToken cancellationToken)
    {
        var recipe = request.Recipe;
        var response = new UpdateRecipeResponse { Success = true };

        var error = RecipeValidation.Validate(recipe);
        if (error is not null)
        {
            response.Success = false;
            response.Message = error;
            return response;
        }

        Recipe? existing;
        try
        {
            // Confirms the recipe exists and is owned by this user, and lets us keep
            // the original CreatedAt rather than trusting/losing it from the payload.
            existing = await _recipeStore.GetRecipe(request.UserId, request.RecipeId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load recipe {RecipeId} for user {UserId}.", request.RecipeId, request.UserId);
            response.Success = false;
            response.Message = "Error occured when trying to update recipe. ";
            return response;
        }

        if (existing is null)
        {
            response.Success = false;
            response.NotFound = true;
            response.Message = "Recipe not found. ";
            return response;
        }

        recipe.Id = request.RecipeId;
        recipe.UserId = request.UserId;
        recipe.CreatedAt = existing.CreatedAt;
        recipe.UpdatedAt = DateTime.UtcNow;

        try
        {
            await _recipeStore.UpdateRecipe(request.UserId, recipe);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update recipe {RecipeId} for user {UserId}.", request.RecipeId, request.UserId);
            response.Success = false;
            response.Message = "Error occured when trying to update recipe. ";
            return response;
        }

        return response;
    }
}
