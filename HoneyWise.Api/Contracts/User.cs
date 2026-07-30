namespace Mead.Tools;

/// <summary>
/// User
/// </summary>
public class User
{
    /// <summary>
    /// Id
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// First Name
    /// </summary>
    public string? FirstName { get; set; }

    /// <summary>
    /// Last Name
    /// </summary>
    public string LastName { get; set; } = string.Empty;

    /// <summary>
    /// UserName
    /// </summary>
    public string UserName { get; set; } = string.Empty;

    /// <summary>
    /// Plan
    /// </summary>
    public string Plan { get; set; } = "free";

    /// <summary>
    /// Password
    /// </summary>
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// Email
    /// </summary>
    public string? Email { get; set; }
}
