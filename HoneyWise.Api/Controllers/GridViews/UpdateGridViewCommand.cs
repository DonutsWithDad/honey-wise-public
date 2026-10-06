using HoneyWise.Api.Store;
using HoneyWise.Contracts;
using MediatR;

namespace HoneyWise.Api.Controllers.GridViews;

/// <summary>
/// Request to overwrite a saved view's name, state and default flag.
/// </summary>
public class UpdateGridViewCommand : IRequest<UpdateGridViewResponse>
{
    /// <summary>Id of the view to update (from the route).</summary>
    public Guid ViewId { get; set; }

    public GridViewInput View { get; set; } = new();

    /// <summary>Owning user's id, resolved from the authenticated principal.</summary>
    public Guid UserId { get; set; }
}

public class UpdateGridViewResponse : GenericResponse
{
    /// <summary>True when no view with that id exists for this user (→ 404).</summary>
    public bool NotFound { get; set; }
}

public class UpdateGridViewCommandHandler : IRequestHandler<UpdateGridViewCommand, UpdateGridViewResponse>
{
    private readonly IGridViewStore _gridViewStore;
    private readonly ILogger<UpdateGridViewCommandHandler> _logger;

    public UpdateGridViewCommandHandler(IGridViewStore gridViewStore, ILogger<UpdateGridViewCommandHandler> logger)
    {
        _gridViewStore = gridViewStore;
        _logger = logger;
    }

    public async Task<UpdateGridViewResponse> Handle(UpdateGridViewCommand request, CancellationToken cancellationToken)
    {
        var input = request.View;
        var response = new UpdateGridViewResponse { Success = true };

        var error = GridViewValidation.Validate(input);
        if (error is not null)
        {
            response.Success = false;
            response.Message = error;
            return response;
        }

        var view = new GridView
        {
            Id = request.ViewId,
            GridKey = input.GridKey,
            Name = input.Name.Trim(),
            State = input.State,
            IsDefault = input.IsDefault,
            UpdatedAt = DateTime.UtcNow,
        };

        bool updated;
        try
        {
            if (await _gridViewStore.NameExists(request.UserId, view.GridKey, view.Name, view.Id))
            {
                response.Success = false;
                response.Message = $"A view named \"{view.Name}\" already exists. ";
                return response;
            }

            updated = await _gridViewStore.UpdateView(request.UserId, view);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update grid view {ViewId} for user {UserId}.", request.ViewId, request.UserId);
            response.Success = false;
            response.Message = "Error occured when trying to save view. ";
            return response;
        }

        if (!updated)
        {
            response.Success = false;
            response.NotFound = true;
            response.Message = "View not found. ";
        }

        return response;
    }
}
