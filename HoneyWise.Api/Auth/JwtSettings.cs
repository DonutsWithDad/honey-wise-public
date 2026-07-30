namespace HoneyWise.Api.Auth;

/// <summary>
/// Strongly-typed JWT configuration bound from the "JwtSettings" section.
/// <see cref="Secret"/> is the symmetric signing key and is the one true secret
/// of the scheme; it is supplied out of source (user-secrets in dev, an
/// environment variable in prod) and must never be committed. The remaining
/// values are non-sensitive and live in appsettings.json.
/// </summary>
public class JwtSettings
{
    /// <summary>Configuration section name.</summary>
    public const string SectionName = "JwtSettings";

    /// <summary>
    /// Symmetric HMAC signing key. Anyone holding this can mint valid tokens for
    /// any user, so it must be long and random (>= 32 bytes) and kept out of source.
    /// </summary>
    public string Secret { get; set; } = string.Empty;

    /// <summary>Token issuer ("iss"); validated on every request.</summary>
    public string Issuer { get; set; } = string.Empty;

    /// <summary>Intended audience ("aud"); validated on every request.</summary>
    public string Audience { get; set; } = string.Empty;

    /// <summary>Access-token lifetime in minutes. Kept short since tokens can't be revoked.</summary>
    public int ExpiryMinutes { get; set; } = 60;
}
