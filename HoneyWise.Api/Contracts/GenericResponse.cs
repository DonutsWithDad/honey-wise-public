
namespace HoneyWise.Contracts;

/// <summary>
/// Generic Response
/// </summary>
public class GenericResponse
{
    /// <summary>
    /// Success
    /// </summary>
    public bool Success { get; set; } = true;
    /// <summary>
    /// Message
    /// </summary>
    public string Message { get; set; } = "";
}