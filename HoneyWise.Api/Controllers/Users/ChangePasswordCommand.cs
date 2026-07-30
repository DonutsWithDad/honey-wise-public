using HoneyWise.Api.Store;
using HoneyWise.Contracts;
using HoneyWise.Utils;
using MediatR;

namespace HoneyWise.Api.Controllers.Users;

/// <summary>
/// Changes the signed-in user's password. The current password must be verified
/// first, so possession of a valid token alone can't change it.
/// </summary>
public class ChangePasswordCommand : IRequest<GenericResponse>
{
    public Guid UserId { get; set; }
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public class ChangePasswordCommandHandler : IRequestHandler<ChangePasswordCommand, GenericResponse>
{
    private readonly IUserStore _userStore;
    private readonly ILogger<ChangePasswordCommandHandler> _logger;

    public ChangePasswordCommandHandler(IUserStore userStore, ILogger<ChangePasswordCommandHandler> logger)
    {
        _userStore = userStore;
        _logger = logger;
    }

    public async Task<GenericResponse> Handle(ChangePasswordCommand request, CancellationToken cancellationToken)
    {
        var response = new GenericResponse();

        if (string.IsNullOrWhiteSpace(request.CurrentPassword))
        {
            response.Success = false;
            response.Message = "Current password is required. ";
            return response;
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
        {
            response.Success = false;
            response.Message = "New password must be at least 6 characters. ";
            return response;
        }

        string? currentHash = await _userStore.GetPasswordHash(request.UserId);

        // No hash means the user vanished between auth and here; treat as unauthorized-ish.
        if (currentHash is null || !PasswordUtils.Verify(currentHash, request.CurrentPassword))
        {
            response.Success = false;
            response.Message = "Current password is incorrect. ";
            return response;
        }

        try
        {
            await _userStore.UpdatePassword(request.UserId, PasswordUtils.Hash(request.NewPassword));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to change password for user {UserId}.", request.UserId);
            response.Success = false;
            response.Message = "Error occured when trying to change password. ";
        }

        return response;
    }
}
