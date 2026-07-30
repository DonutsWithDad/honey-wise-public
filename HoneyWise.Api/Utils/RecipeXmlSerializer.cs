using System.Text;
using System.Xml;
using System.Xml.Serialization;
using Mead.Tools;

namespace HoneyWise.Utils;

/// <summary>
/// Serializes a <see cref="Recipe"/> to and from XML. XML is the storage +
/// export format for recipes (the API itself speaks JSON), so this is the one
/// place that knows the on-disk shape. Kept static and dependency-free, mirroring
/// <see cref="PasswordUtils"/>.
/// </summary>
public static class RecipeXmlSerializer
{
    // XmlSerializer instances are expensive to build and are thread-safe once
    // constructed, so a single shared instance per type is reused.
    private static readonly XmlSerializer _serializer = new(typeof(Recipe));

    // Omit the xsi/xsd namespace declarations; the document is ours end to end
    // and does not need schema references cluttering every export.
    private static readonly XmlSerializerNamespaces _emptyNamespaces =
        new(new[] { XmlQualifiedName.Empty });

    /// <summary>
    /// Serializes a recipe to an indented, UTF-8 XML string suitable for storing
    /// in a Postgres <c>xml</c> column and for direct export/download.
    /// </summary>
    public static string Serialize(Recipe recipe)
    {
        ArgumentNullException.ThrowIfNull(recipe);

        var settings = new XmlWriterSettings
        {
            Indent = true,
            Encoding = Encoding.UTF8,
            // The string we return is UTF-16 in memory; drop the XML declaration's
            // encoding attribute so it doesn't contradict how the string is later stored.
            OmitXmlDeclaration = false,
        };

        using var stringWriter = new Utf8StringWriter();
        using (var xmlWriter = XmlWriter.Create(stringWriter, settings))
        {
            _serializer.Serialize(xmlWriter, recipe, _emptyNamespaces);
        }

        return stringWriter.ToString();
    }

    /// <summary>
    /// Reconstructs a recipe from XML produced by <see cref="Serialize"/>.
    /// </summary>
    public static Recipe Deserialize(string xml)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(xml);

        using var stringReader = new StringReader(xml);
        var recipe = (Recipe?)_serializer.Deserialize(stringReader);

        return recipe
            ?? throw new InvalidOperationException("Stored recipe XML could not be deserialized.");
    }

    /// <summary>
    /// StringWriter defaults to UTF-16; overriding the encoding makes the XML
    /// declaration report <c>utf-8</c>, matching how the value is stored/served.
    /// </summary>
    private sealed class Utf8StringWriter : StringWriter
    {
        public override Encoding Encoding => Encoding.UTF8;
    }
}
