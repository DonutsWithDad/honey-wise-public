using Microsoft.AspNetCore.Identity;

namespace HoneyWise.Utils;

/// <summary>
/// Password hashing helpers. Passwords are hashed one-way with PBKDF2 (via
/// ASP.NET Core's <see cref="PasswordHasher{TUser}"/>) using a random per-password
/// salt. The plaintext is never stored and cannot be recovered from the hash;
/// login verifies an attempt by re-hashing and comparing, never by decrypting.
/// </summary>
public static class PasswordUtils
{
    // PasswordHasher is stateless and thread-safe, so a single shared instance is fine.
    // The generic user argument is unused by the default implementation, so we bind
    // it to object and pass a throwaway instance rather than coupling to the User type.
    private static readonly PasswordHasher<object> _hasher = new();
    private static readonly object _user = new();

    /// <summary>
    /// Hashes a plaintext password. The returned string embeds the algorithm,
    /// iteration count and random salt, so it is the only value that needs storing.
    /// </summary>
    public static string Hash(string password)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(password);
        return _hasher.HashPassword(_user, password);
    }

    /// <summary>
    /// Verifies a plaintext attempt against a stored hash produced by <see cref="Hash"/>.
    /// Returns false for a mismatch or any missing input rather than throwing.
    /// </summary>
    public static bool Verify(string hashedPassword, string providedPassword)
    {
        if (string.IsNullOrWhiteSpace(hashedPassword) || string.IsNullOrWhiteSpace(providedPassword))
        {
            return false;
        }

        // Treat SuccessRehashNeeded as success too; it only signals the hash used
        // older parameters and could be upgraded on next login.
        return _hasher.VerifyHashedPassword(_user, hashedPassword, providedPassword)
            != PasswordVerificationResult.Failed;
    }
}
