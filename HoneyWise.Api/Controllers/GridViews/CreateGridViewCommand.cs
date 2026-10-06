using HoneyWise.Api.Store;
using HoneyWise.Contracts;
using HoneyWise.Utils;
using MediatR;

namespace HoneyWise.Api.Controllers.GridViews;

/// <summary>
/// Request to save a new named view for one of the caller's grids.
/// </summary>
public class CreateGridViewCommand : IRequest<CreateGridViewResponse>
{
    public GridViewInput View { get; set; } = new();

    /// <summary>Owning user's id, resolved from the authenticated principal.</summary>
    public Guid UserId { get; set; }
}

public class CreateGridViewResponse : GenericResponse
{
    public Guid Id { get; set; }
}

public class CreateGridViewCommandHandler : IRequestHandler<CreateGridViewCommand, CreateGridViewResponse>
{
    private readonly IGridViewStore _gridViewStore;
    private readonly ILogger<CreateGridViewCommandHandler> _logger;

    public CreateGridViewCommandHandler(IGridViewStore gridViewStore, ILogger<CreateGridViewCommandHandler> logger)
    {
        _gridViewStore = gridViewStore;
        _logger = logger;
    }

    public async Task<CreateGridViewResponse> Handle(CreateGridViewCommand request, CancellationToken cancellationToken)
    {
        var input = request.View;
        var response = new CreateGridViewResponse { Success = true };

        var error = GridViewValidation.Validate(input);
        if (error is not null)
        {
            response.Success = false;
            response.Message = error;
            return response;
        }

        var view = new GridView
        {
            // Server owns identity and timestamps; never trust these from the caller.
            Id = IdUtils.NewGuid(),
            GridKey = input.GridKey,
            Name = input.Name.Trim(),
            State = input.State,
            IsDefault = input.IsDefault,
            CreatedAt = DateTime.UtcNow,
        };
        view.UpdatedAt = view.CreatedAt;

        try
        {
            if (await _gridViewStore.NameExists(request.UserId, view.GridKey, view.Name, view.Id))
            {
                response.Success = false;
                response.Message = $"A view named \"{view.Name}\" already exists. ";
                return response;
            }

            await _gridViewStore.CreateView(request.UserId, view);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create grid view {ViewName} for user {UserId}.", view.Name, request.UserId);

            response.Success = false;
            response.Message = "Error occured when trying to save view. ";
            return response;
        }

        response.Id = view.Id;
        return response;
    }
}
