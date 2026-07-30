using HoneyWise.Api.Auth;
using MediatR;

namespace HoneyWise.Api.Controllers.Users;

/// <summary>
/// Re-issues a fresh access token for an already-authenticated user, extending
/// their session. The controller only reaches this behind <c>[Authorize]</c>, so
/// a caller with an expired or invalid token is rejected before we ever mint one;
/// this is what lets an active user's session slide forward instead of dropping.
/// </summary>
public class RefreshTokenCommand : IRequest<string>
{
    public Guid UserId { get; set; }
    public string Plan { get; set; } = "free";
}

public class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, string>
{
    private readonly ITokenService _tokenService;

    public RefreshTokenCommandHandler(ITokenService tokenService)
    {
        _tokenService = tokenService;
    }

    public Task<string> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        return Task.FromResult(_tokenService.CreateToken(request.UserId, request.Plan));
    }
}
