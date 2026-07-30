using Mead.Tools;
using HoneyWise.Api.Store;
using HoneyWise.Contracts;
using HoneyWise.Utils;
using MediatR;

namespace HoneyWise.Api.Controllers.Users;

/// <summary>
/// Request to create a new user. Carries the <see cref="User"/> contract from
/// the controller; business logic lives in the handler so it can be unit
/// tested in isolation.
/// </summary>
public class CreateUserCommand : IRequest<CreateUserResponse>
{
    /// <summary>
    /// User
    /// </summary>
    public User User { get; set; } = new();
}

public class CreateUserResponse : GenericResponse
{
    public Guid Id { get; set; }
}

public class CreateUserCommandHandler : IRequestHandler<CreateUserCommand, CreateUserResponse>
{
    private readonly IUserStore _userStore;
    private readonly ILogger<CreateUserCommandHandler> _logger;

    public CreateUserCommandHandler(IUserStore userStore, ILogger<CreateUserCommandHandler> logger)
    {
        _userStore = userStore;
        _logger = logger;
    }

    /// <summary>
    /// Handler
    /// </summary>
    /// <param name="request"></param>
    /// <param name="cancellationToken"></param>
    /// <returns></returns>
    /// <exception cref="ArgumentException"></exception>
    public async Task<CreateUserResponse> Handle(CreateUserCommand request, CancellationToken cancellationToken)
    {
        var user = request.User;

        CreateUserResponse response = new CreateUserResponse()
        {
            Id = Guid.Empty,
            Success = true
        };

        if (string.IsNullOrWhiteSpace(user.LastName))
        {
            response.Success = false;
            response.Message = "Last Name is required. ";
            return response;
        }

        if (string.IsNullOrWhiteSpace(user.UserName))
        {
            response.Success = false;
            response.Message = "UserName is required. ";
            return response;
        }

        if (string.IsNullOrWhiteSpace(user.Password))
        {
            response.Success = false;
            response.Message = "Password is Required. ";
            return response;
        }

        // Server owns identity and the default plan; never trust these from the caller.
        user.Id = IdUtils.NewGuid();
        user.Plan = string.IsNullOrWhiteSpace(user.Plan) ? "free" : user.Plan;

        // Only ever persist the hash; the plaintext leaves scope here and is never stored.
        user.Password = PasswordUtils.Hash(user.Password);

        try
        {
            await _userStore.CreateUser(user);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create user {UserName} (Id: {UserId}).", user.UserName, user.Id);

            response.Success = false;
            response.Message = "Error occured when trying to create User. ";
            return response;
        }

        return response;
    }
}
