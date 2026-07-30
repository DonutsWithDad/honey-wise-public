using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace HoneyWise.Api.Auth;

/// <summary>
/// Mints signed access tokens for verified users. Kept behind an interface so
/// handlers depend on the capability, not on the JWT implementation, and so it
/// can be swapped or faked in tests.
/// </summary>
public interface ITokenService
{
    /// <summary>
    /// Creates a signed JWT for an already-authenticated user. The caller is
    /// responsible for verifying credentials first; this method does not check
    /// anything, it only encodes identity.
    /// </summary>
    string CreateToken(Guid userId, string plan);
}

/// <summary>
/// JWT implementation of <see cref="ITokenService"/>. Signs tokens with the
/// symmetric key from <see cref="JwtSettings"/> using HMAC-SHA256.
/// </summary>
public class JwtTokenService : ITokenService
{
    private readonly JwtSettings _settings;

    public JwtTokenService(IOptions<JwtSettings> settings)
    {
        _settings = settings.Value;

        // Fail fast at construction rather than minting unsigned/weakly-signed tokens
        // if the secret was never configured. 32 bytes is the minimum for HMAC-SHA256.
        if (Encoding.UTF8.GetByteCount(_settings.Secret) < 32)
        {
            throw new InvalidOperationException(
                "JwtSettings:Secret is missing or too short (need >= 32 bytes). " +
                "Set it via user-secrets in development or an environment variable in production.");
        }
    }

    public string CreateToken(Guid userId, string plan)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var now = DateTime.UtcNow;

        var claims = new List<Claim>
        {
            // Subject is the user's Id; this is who the token authenticates.
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            // Unique token id, so individual tokens are distinguishable in logs/audits.
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            // Plan travels in the token so authorization can gate features without a DB hit.
            new("plan", plan),
        };

        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            notBefore: now,
            expires: now.AddMinutes(_settings.ExpiryMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
