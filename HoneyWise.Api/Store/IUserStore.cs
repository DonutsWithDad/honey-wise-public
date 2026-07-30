using Mead.Tools;
using HoneyWise.Utils;
using Npgsql;

namespace HoneyWise.Api.Store;

/// <summary>
/// The verified identity of a user who has just logged in successfully.
/// Carries only what the caller needs to mint a token; never includes the hash.
/// </summary>
public record AuthenticatedUser(Guid Id, string Plan);

/// <summary>
/// A user's profile as read back for display/editing. Deliberately excludes the
/// password hash so it can never leak through a profile endpoint.
/// </summary>
public record UserProfile(
    Guid Id,
    string? FirstName,
    string LastName,
    string UserName,
    string? Email,
    string Plan);

/// <summary>
/// Externally facing contract for persisting <see cref="User"/> data.
/// Command handlers depend on this interface, never on the concrete store.
/// </summary>
public interface IUserStore
{
    Task CreateUser(User user);

    /// <summary>
    /// Verifies a login attempt against the stored password hash and returns the
    /// matching user's identity, or <c>null</c> if the username is unknown or the
    /// password does not match.
    /// </summary>
    Task<AuthenticatedUser?> Login(Login login);

    /// <summary>
    /// Reads a user's profile by id, or <c>null</c> if no such user exists. Never
    /// returns the password hash.
    /// </summary>
    Task<UserProfile?> GetProfile(Guid id);

    /// <summary>
    /// Returns true if the username is already taken by a user other than
    /// <paramref name="excludeId"/> (so a user keeping their own name isn't a clash).
    /// </summary>
    Task<bool> UserNameExists(string userName, Guid excludeId);

    /// <summary>Updates a user's username.</summary>
    Task UpdateUserName(Guid id, string userName);

    /// <summary>
    /// Returns the stored password hash for a user, or <c>null</c> if the user
    /// doesn't exist. Used to verify the current password before a change.
    /// </summary>
    Task<string?> GetPasswordHash(Guid id);

    /// <summary>Replaces a user's stored password hash.</summary>
    Task UpdatePassword(Guid id, string passwordHash);
}

/// <summary>
/// Concrete store that talks directly to Postgres. Kept internal to the
/// interface so callers are forced to go through <see cref="IUserStore"/>.
/// </summary>
public class UserStore : IUserStore
{
    private readonly IConfiguration _configuration;

    public UserStore(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    private string ConnectionString =>
        _configuration["HoneyWiseConnection"]
            ?? throw new InvalidOperationException("Missing 'HoneyWiseConnection' connection string.");

    public async Task CreateUser(User user)
    {
        var connectionString = _configuration["HoneyWiseConnection"]
            ?? throw new InvalidOperationException("Missing 'HoneyWiseConnection' connection string.");

        const string sql = """
            INSERT INTO "Tool"."User"
                ("Id", "FirstName", "LastName", "UserName", "Plan", "Password", "Email")
            VALUES
                (@Id, @FirstName, @LastName, @UserName, @Plan, @Password, @Email);
            """;

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", user.Id);
        command.Parameters.AddWithValue("@FirstName", (object?)user.FirstName ?? DBNull.Value);
        command.Parameters.AddWithValue("@LastName", user.LastName);
        command.Parameters.AddWithValue("@UserName", user.UserName);
        command.Parameters.AddWithValue("@Plan", user.Plan);
        command.Parameters.AddWithValue("@Password", user.Password);
        command.Parameters.AddWithValue("@Email", (object?)user.Email ?? DBNull.Value);

        await command.ExecuteNonQueryAsync();
    }

    public async Task<AuthenticatedUser?> Login(Login login)
    {
        var connectionString = _configuration["HoneyWiseConnection"]
            ?? throw new InvalidOperationException("Missing 'HoneyWiseConnection' connection string.");

        // Fetch the stored hash by username; the password check happens in code, not
        // in SQL, because each hash carries its own salt and can't be matched by equality.
        const string sql = """
            SELECT "Id", "Password", "Plan"
            FROM "Tool"."User"
            WHERE "UserName" = @UserName;
            """;

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("@UserName", login.UserName);

        await using var reader = await command.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return null;
        }

        var userId = reader.GetGuid(0);
        var storedHash = reader.GetString(1);
        var plan = reader.GetString(2);

        return PasswordUtils.Verify(storedHash, login.Password)
            ? new AuthenticatedUser(userId, plan)
            : null;
    }

    public async Task<UserProfile?> GetProfile(Guid id)
    {
        const string sql = """
            SELECT "Id", "FirstName", "LastName", "UserName", "Email", "Plan"
            FROM "Tool"."User"
            WHERE "Id" = @Id;
            """;

        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", id);

        await using var reader = await command.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return null;
        }

        return new UserProfile(
            Id: reader.GetGuid(0),
            FirstName: reader.IsDBNull(1) ? null : reader.GetString(1),
            LastName: reader.GetString(2),
            UserName: reader.GetString(3),
            Email: reader.IsDBNull(4) ? null : reader.GetString(4),
            Plan: reader.GetString(5));
    }

    public async Task<bool> UserNameExists(string userName, Guid excludeId)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1 FROM "Tool"."User"
                WHERE "UserName" = @UserName AND "Id" <> @ExcludeId
            );
            """;

        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("@UserName", userName);
        command.Parameters.AddWithValue("@ExcludeId", excludeId);

        return (bool)(await command.ExecuteScalarAsync() ?? false);
    }

    public async Task UpdateUserName(Guid id, string userName)
    {
        const string sql = """
            UPDATE "Tool"."User" SET "UserName" = @UserName WHERE "Id" = @Id;
            """;

        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", id);
        command.Parameters.AddWithValue("@UserName", userName);

        await command.ExecuteNonQueryAsync();
    }

    public async Task<string?> GetPasswordHash(Guid id)
    {
        const string sql = """
            SELECT "Password" FROM "Tool"."User" WHERE "Id" = @Id;
            """;

        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", id);

        return (await command.ExecuteScalarAsync()) as string;
    }

    public async Task UpdatePassword(Guid id, string passwordHash)
    {
        const string sql = """
            UPDATE "Tool"."User" SET "Password" = @Password WHERE "Id" = @Id;
            """;

        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", id);
        command.Parameters.AddWithValue("@Password", passwordHash);

        await command.ExecuteNonQueryAsync();
    }
}
