using Mead.Tools;
using HoneyWise.Api.Store;
using HoneyWise.Contracts;
using HoneyWise.Utils;
using MediatR;

namespace HoneyWise.Api.Controllers.Recipes;

/// <summary>
/// Request to create a new recipe. Carries the <see cref="Recipe"/> from the body
/// plus the owning user's id resolved from the JWT by the controller. Business
/// logic lives in the handler so it can be unit tested in isolation.
/// </summary>
public class CreateRecipeCommand : IRequest<CreateRecipeResponse>
{
    /// <summary>
    /// Recipe supplied by the caller. Server-owned fields (Id, UserId, timestamps)
    /// are overwritten by the handler.
    /// </summary>
    public Recipe Recipe { get; set; } = new();

    /// <summary>
    /// Owning user's id, resolved from the authenticated principal.
    /// </summary>
    public Guid UserId { get; set; }
}

public class CreateRecipeResponse : GenericResponse
{
    public Guid Id { get; set; }
}

public class CreateRecipeCommandHandler : IRequestHandler<CreateRecipeCommand, CreateRecipeResponse>
{
    private readonly IRecipeStore _recipeStore;
    private readonly ILogger<CreateRecipeCommandHandler> _logger;

    public CreateRecipeCommandHandler(IRecipeStore recipeStore, ILogger<CreateRecipeCommandHandler> logger)
    {
        _recipeStore = recipeStore;
        _logger = logger;
    }

    public async Task<CreateRecipeResponse> Handle(CreateRecipeCommand request, CancellationToken cancellationToken)
    {
        var recipe = request.Recipe;
        var response = new CreateRecipeResponse { Success = true };

        var error = RecipeValidation.Validate(recipe);
        if (error is not null)
        {
            response.Success = false;
            response.Message = error;
            return response;
        }

        // Server owns identity, ownership and timestamps; never trust these from the caller.
        recipe.Id = IdUtils.NewGuid();
        recipe.UserId = request.UserId;
        recipe.CreatedAt = DateTime.UtcNow;
        recipe.UpdatedAt = recipe.CreatedAt;

        try
        {
            await _recipeStore.CreateRecipe(request.UserId, recipe);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create recipe {RecipeName} for user {UserId}.", recipe.Name, request.UserId);

            response.Success = false;
            response.Message = "Error occured when trying to create recipe. ";
            return response;
        }

        response.Id = recipe.Id;
        return response;
    }
}
