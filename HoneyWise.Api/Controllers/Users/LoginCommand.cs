using Mead.Tools;
using HoneyWise.Api.Auth;
using HoneyWise.Api.Store;
using HoneyWise.Contracts;
using MediatR;

namespace HoneyWise.Api.Controllers.Users;

/// <summary>
/// Request to login. Carries the <see cref="Login"/> contract from
/// the controller; business logic lives in the handler so it can be unit
/// tested in isolation.
/// </summary>
public class LoginCommand : IRequest<LoginCommandResponse>
{
    /// <summary>
    /// Login
    /// </summary>
    public Login Login { get; set; } = new();
}

public class LoginCommandResponse : GenericResponse
{
    public string? Token { get; set; }
}

public class LoginCommandHandler : IRequestHandler<LoginCommand, LoginCommandResponse>
{
    private readonly IUserStore _userStore;
    private readonly ITokenService _tokenService;

    public LoginCommandHandler(IUserStore userStore, ITokenService tokenService)
    {
        _userStore = userStore;
        _tokenService = tokenService;
    }

    /// <summary>
    /// Handler
    /// </summary>
    /// <param name="request"></param>
    /// <param name="cancellationToken"></param>
    /// <returns></returns>
    /// <exception cref="ArgumentException"></exception>
    public async Task<LoginCommandResponse> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var login = request.Login;
        LoginCommandResponse response = new LoginCommandResponse();

        if (string.IsNullOrWhiteSpace(login.UserName))
        {
            response.Success = false;
            response.Message = "UserName is required. ";
            return response;
        }

        if (string.IsNullOrWhiteSpace(login.Password))
        {
            response.Success = false;
            response.Message = "Password is required. ";
            return response;
        }

        AuthenticatedUser? user = await _userStore.Login(login);

        // Same generic message whether the username is unknown or the password is
        // wrong, so the response never reveals which usernames exist.
        if (user is null)
        {
            response.Success = false;
            response.Message = "Invalid username or password. ";
            return response;
        }

        // Credentials verified: mint a signed JWT carrying the user's identity and plan.
        response.Token = _tokenService.CreateToken(user.Id, user.Plan);

        return response;
    }
}
