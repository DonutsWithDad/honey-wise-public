using System.Reflection;
using DbUp;
using DbUp.Engine;
using DbUp.Helpers;

namespace HoneyWise.Migrations;

/// <summary>
/// Brings a HoneyWise Postgres database up to date. Run on every local start,
/// in CI, and once per deploy before the API starts.
///
///   dotnet run --project HoneyWise.Migrations -- [--connection "&lt;cs&gt;"] [--seed-dev]
///
/// The connection string comes from --connection, else the HoneyWiseConnection
/// environment variable (the same key the API reads).
///
/// Scripts/   numbered schema + reference-data scripts. Each runs exactly once and
///            is recorded in the "schemaversions" journal; never edit one after it
///            has been merged, add a new numbered script instead.
/// SeedDev/   sample data for local development only (--seed-dev). Never journaled,
///            so these run every time and must stay idempotent.
/// </summary>
public static class Program
{
    public static int Main(string[] args)
    {
        var connectionString = GetOption(args, "--connection")
            ?? Environment.GetEnvironmentVariable("HoneyWiseConnection");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            Console.Error.WriteLine(
                "No connection string. Pass --connection \"<cs>\" or set the HoneyWiseConnection environment variable.");
            return 2;
        }

        var seedDev = args.Contains("--seed-dev");

        try
        {
            // Creates the database itself on a brand-new server; a no-op otherwise.
            EnsureDatabase.For.PostgresqlDatabase(connectionString);

            if (!Run(connectionString, "Scripts", journaled: true))
            {
                return 1;
            }

            if (seedDev && !Run(connectionString, "SeedDev", journaled: false))
            {
                return 1;
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Migration failed: {ex.Message}");
            return 1;
        }

        Console.WriteLine("Database is up to date.");
        return 0;
    }

    private static bool Run(string connectionString, string folder, bool journaled)
    {
        // Embedded resource names are "HoneyWise.Migrations.<folder>.<file>.sql", and
        // DbUp runs them in name order, so the numeric prefixes set the order.
        var prefix = $"{typeof(Program).Namespace}.{folder}.";

        var builder = DeployChanges.To
            .PostgresqlDatabase(connectionString)
            .WithScriptsEmbeddedInAssembly(
                Assembly.GetExecutingAssembly(),
                name => name.StartsWith(prefix, StringComparison.Ordinal))
            .WithTransactionPerScript()
            .LogToConsole();

        if (!journaled)
        {
            builder = builder.JournalTo(new NullJournal());
        }

        DatabaseUpgradeResult result = builder.Build().PerformUpgrade();

        if (!result.Successful)
        {
            Console.Error.WriteLine(
                $"Script '{result.ErrorScript?.Name}' failed: {result.Error?.Message}");
            return false;
        }

        return true;
    }

    private static string? GetOption(string[] args, string name)
    {
        var index = Array.IndexOf(args, name);
        return index >= 0 && index + 1 < args.Length ? args[index + 1] : null;
    }
}
