using HoneyWise.Api.Store;
using HoneyWise.Contracts;
using MediatR;

namespace HoneyWise.Api.Controllers.Recipes;

/// <summary>
/// Request to delete a recipe owned by the caller.
/// </summary>
public class DeleteRecipeCommand : IRequest<DeleteRecipeResponse>
{
    /// <summary>Id of the recipe to delete (from the route).</summary>
    public Guid RecipeId { get; set; }

    /// <summary>Owning user's id, resolved from the authenticated principal.</summary>
    public Guid UserId { get; set; }
}

public class DeleteRecipeResponse : GenericResponse
{
    /// <summary>True when no recipe with that id exists for this user (→ 404).</summary>
    public bool NotFound { get; set; }
}

public class DeleteRecipeCommandHandler : IRequestHandler<DeleteRecipeCommand, DeleteRecipeResponse>
{
    private readonly IRecipeStore _recipeStore;
    private readonly ILogger<DeleteRecipeCommandHandler> _logger;

    public DeleteRecipeCommandHandler(IRecipeStore recipeStore, ILogger<DeleteRecipeCommandHandler> logger)
    {
        _recipeStore = recipeStore;
        _logger = logger;
    }

    public async Task<DeleteRecipeResponse> Handle(DeleteRecipeCommand request, CancellationToken cancellationToken)
    {
        var response = new DeleteRecipeResponse { Success = true };

        bool deleted;
        try
        {
            deleted = await _recipeStore.DeleteRecipe(request.UserId, request.RecipeId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete recipe {RecipeId} for user {UserId}.", request.RecipeId, request.UserId);
            response.Success = false;
            response.Message = "Error occured when trying to delete recipe. ";
            return response;
        }

        if (!deleted)
        {
            response.Success = false;
            response.NotFound = true;
            response.Message = "Recipe not found. ";
        }

        return response;
    }
}
