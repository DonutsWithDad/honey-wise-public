using HoneyWise.Api.Store;
using HoneyWise.Contracts;
using MediatR;

namespace HoneyWise.Api.Controllers.GridViews;

/// <summary>
/// Request to delete a saved view owned by the caller.
/// </summary>
public class DeleteGridViewCommand : IRequest<DeleteGridViewResponse>
{
    /// <summary>Id of the view to delete (from the route).</summary>
    public Guid ViewId { get; set; }

    /// <summary>Owning user's id, resolved from the authenticated principal.</summary>
    public Guid UserId { get; set; }
}

public class DeleteGridViewResponse : GenericResponse
{
    /// <summary>True when no view with that id exists for this user (→ 404).</summary>
    public bool NotFound { get; set; }
}

public class DeleteGridViewCommandHandler : IRequestHandler<DeleteGridViewCommand, DeleteGridViewResponse>
{
    private readonly IGridViewStore _gridViewStore;
    private readonly ILogger<DeleteGridViewCommandHandler> _logger;

    public DeleteGridViewCommandHandler(IGridViewStore gridViewStore, ILogger<DeleteGridViewCommandHandler> logger)
    {
        _gridViewStore = gridViewStore;
        _logger = logger;
    }

    public async Task<DeleteGridViewResponse> Handle(DeleteGridViewCommand request, CancellationToken cancellationToken)
    {
        var response = new DeleteGridViewResponse { Success = true };

        bool deleted;
        try
        {
            deleted = await _gridViewStore.DeleteView(request.UserId, request.ViewId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete grid view {ViewId} for user {UserId}.", request.ViewId, request.UserId);
            response.Success = false;
            response.Message = "Error occured when trying to delete view. ";
            return response;
        }

        if (!deleted)
        {
            response.Success = false;
            response.NotFound = true;
            response.Message = "View not found. ";
        }

        return response;
    }
}
