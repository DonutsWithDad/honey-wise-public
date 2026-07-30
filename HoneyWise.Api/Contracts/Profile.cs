namespace HoneyWise.Contracts;

/// <summary>
/// The signed-in user's profile, returned by GET /Users/me. Never carries the
/// password hash — it's the safe, display-facing view of a user.
/// </summary>
public class UserProfileResponse
{
    /// <summary>Id</summary>
    public Guid Id { get; set; }

    /// <summary>First Name</summary>
    public string? FirstName { get; set; }

    /// <summary>Last Name</summary>
    public string LastName { get; set; } = string.Empty;

    /// <summary>UserName</summary>
    public string UserName { get; set; } = string.Empty;

    /// <summary>Email</summary>
    public string? Email { get; set; }

    /// <summary>Plan</summary>
    public string Plan { get; set; } = "free";
}

/// <summary>Payload sent to PUT /Users/me/username to change the display name.</summary>
public class UpdateUserNameRequest
{
    /// <summary>UserName</summary>
    public string UserName { get; set; } = string.Empty;
}

/// <summary>
/// Payload sent to PUT /Users/me/password. The current password is required so a
/// stolen token alone can't lock a user out by changing their password.
/// </summary>
public class ChangePasswordRequest
{
    /// <summary>Current Password</summary>
    public string CurrentPassword { get; set; } = string.Empty;

    /// <summary>New Password</summary>
    public string NewPassword { get; set; } = string.Empty;
}
