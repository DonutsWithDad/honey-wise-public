using System.Text.Json;
using HoneyWise.Contracts;

namespace HoneyWise.Api.Controllers.GridViews;

/// <summary>
/// Shared input validation for creating and updating a grid view, so both enforce
/// the same rules.
/// </summary>
internal static class GridViewValidation
{
    public const int MaxNameLength = 60;
    public const int MaxGridKeyLength = 50;

    // A grid layout is a few KB at most; this just stops the column being used as
    // arbitrary blob storage.
    private const int MaxStateLength = 64 * 1024;

    /// <summary>
    /// Returns an error message if the input is invalid, or <c>null</c> if it's
    /// good to persist.
    /// </summary>
    public static string? Validate(GridViewInput input)
    {
        if (input is null)
        {
            return "View is required. ";
        }

        if (string.IsNullOrWhiteSpace(input.GridKey) || input.GridKey.Length > MaxGridKeyLength)
        {
            return "GridKey is required. ";
        }

        var name = input.Name?.Trim() ?? string.Empty;
        if (name.Length == 0)
        {
            return "Name is required. ";
        }

        if (name.Length > MaxNameLength)
        {
            return $"Name must be {MaxNameLength} characters or fewer. ";
        }

        if (input.State.ValueKind != JsonValueKind.Object)
        {
            return "State must be a JSON object. ";
        }

        if (input.State.GetRawText().Length > MaxStateLength)
        {
            return "State is too large. ";
        }

        return null;
    }
}
