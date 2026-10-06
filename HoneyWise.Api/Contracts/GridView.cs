using System.Text.Json;

namespace HoneyWise.Contracts;

/// <summary>
/// A named, saved layout for one of the web app's grids. <see cref="State"/> is
/// opaque JSON owned by the client; the API stores and returns it untouched.
/// </summary>
public class GridView
{
    public Guid Id { get; set; }

    /// <summary>Which grid this view belongs to, e.g. "recipes".</summary>
    public string GridKey { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public JsonElement State { get; set; }

    /// <summary>True for the view the grid opens with. At most one per grid.</summary>
    public bool IsDefault { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// Body for POST /GridViews and PUT /GridViews/{id}. Server-owned fields (id,
/// owner, timestamps) are intentionally omitted.
/// </summary>
public class GridViewInput
{
    public string GridKey { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public JsonElement State { get; set; }

    public bool IsDefault { get; set; }
}
