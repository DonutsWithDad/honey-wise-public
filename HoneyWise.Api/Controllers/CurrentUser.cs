using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace HoneyWise.Api.Controllers;

/// <summary>
/// Helpers for reading the authenticated user's id off the current principal.
/// Tokens are minted with the user's id in the <c>sub</c> claim
/// (<see cref="HoneyWise.Api.Auth.JwtTokenService"/>); JwtBearer's default inbound
/// claim mapping surfaces that as <see cref="ClaimTypes.NameIdentifier"/>, but we
/// also check the raw <c>sub</c> claim in case mapping is ever turned off.
/// </summary>
public static class CurrentUser
{
    /// <summary>
    /// Returns the authenticated user's id, or throws if the principal carries no
    /// usable subject claim (which shouldn't happen behind <c>[Authorize]</c>).
    /// </summary>
    public static Guid GetId(this ControllerBase controller)
    {
        var value =
            controller.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? controller.User.FindFirstValue(JwtRegisteredClaimNames.Sub);

        if (Guid.TryParse(value, out var id))
        {
            return id;
        }

        throw new InvalidOperationException("Authenticated user id is missing or malformed.");
    }

    /// <summary>
    /// Returns the plan carried in the token's <c>plan</c> claim, falling back to
    /// "free" if it is somehow absent. Used when re-issuing a token so the caller's
    /// plan travels forward without an extra database read.
    /// </summary>
    public static string GetPlan(this ControllerBase controller)
    {
        var plan = controller.User.FindFirstValue("plan");
        return string.IsNullOrWhiteSpace(plan) ? "free" : plan;
    }
}
