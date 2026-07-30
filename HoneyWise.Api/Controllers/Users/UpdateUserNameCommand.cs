using HoneyWise.Api.Store;
using HoneyWise.Contracts;
using MediatR;

namespace HoneyWise.Api.Controllers.Users;

/// <summary>
/// Changes the signed-in user's username. The user id comes from the
/// authenticated principal, never from the request body.
/// </summary>
public class UpdateUserNameCommand : IRequest<GenericResponse>
{
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
}

public class UpdateUserNameCommandHandler : IRequestHandler<UpdateUserNameCommand, GenericResponse>
{
    private readonly IUserStore _userStore;
    private readonly ILogger<UpdateUserNameCommandHandler> _logger;

    public UpdateUserNameCommandHandler(IUserStore userStore, ILogger<UpdateUserNameCommandHandler> logger)
    {
        _userStore = userStore;
        _logger = logger;
    }

    public async Task<GenericResponse> Handle(UpdateUserNameCommand request, CancellationToken cancellationToken)
    {
        var response = new GenericResponse();
        var userName = request.UserName?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(userName))
        {
            response.Success = false;
            response.Message = "UserName is required. ";
            return response;
        }

        if (userName.Length < 3)
        {
            response.Success = false;
            response.Message = "UserName must be at least 3 characters. ";
            return response;
        }

        if (await _userStore.UserNameExists(userName, request.UserId))
        {
            response.Success = false;
            response.Message = "That username is already taken. ";
            return response;
        }

        try
        {
            await _userStore.UpdateUserName(request.UserId, userName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update username for user {UserId}.", request.UserId);
            response.Success = false;
            response.Message = "Error occured when trying to update username. ";
        }

        return response;
    }
}
