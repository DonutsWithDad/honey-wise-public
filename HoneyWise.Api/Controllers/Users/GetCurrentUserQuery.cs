using HoneyWise.Api.Store;
using HoneyWise.Contracts;
using MediatR;

namespace HoneyWise.Api.Controllers.Users;

/// <summary>
/// Reads the signed-in user's profile. The controller supplies the id from the
/// authenticated principal; the handler never trusts a caller-supplied id.
/// </summary>
public class GetCurrentUserQuery : IRequest<UserProfileResponse?>
{
    public Guid UserId { get; set; }
}

public class GetCurrentUserQueryHandler : IRequestHandler<GetCurrentUserQuery, UserProfileResponse?>
{
    private readonly IUserStore _userStore;

    public GetCurrentUserQueryHandler(IUserStore userStore)
    {
        _userStore = userStore;
    }

    public async Task<UserProfileResponse?> Handle(GetCurrentUserQuery request, CancellationToken cancellationToken)
    {
        UserProfile? profile = await _userStore.GetProfile(request.UserId);

        if (profile is null)
        {
            return null;
        }

        return new UserProfileResponse
        {
            Id = profile.Id,
            FirstName = profile.FirstName,
            LastName = profile.LastName,
            UserName = profile.UserName,
            Email = profile.Email,
            Plan = profile.Plan,
        };
    }
}
