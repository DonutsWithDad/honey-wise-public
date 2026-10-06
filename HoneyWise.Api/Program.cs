
using System.Text;
using HoneyWise.Api.Auth;
using HoneyWise.Api.Store;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace HoneyWise.Api;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Add services to the container.

        // Allow the Angular dev server (honey-wise-web) to call this API from the browser.
        const string WebAppCorsPolicy = "WebAppCorsPolicy";
        var allowedOrigins = builder.Configuration
            .GetSection("Cors:AllowedOrigins")
            .Get<string[]>()
            ?? new[] { "http://localhost:4200" };

        builder.Services.AddCors(options =>
        {
            options.AddPolicy(WebAppCorsPolicy, policy =>
                policy.WithOrigins(allowedOrigins)
                      .AllowAnyHeader()
                      .AllowAnyMethod());
        });

        builder.Services.AddControllers();
        // Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
        builder.Services.AddOpenApi();

        builder.Services.AddMediatR(cfg =>
            cfg.RegisterServicesFromAssembly(typeof(Program).Assembly));

        builder.Services.AddScoped<IUserStore, UserStore>();
        builder.Services.AddScoped<IRecipeStore, RecipeStore>();
        builder.Services.AddScoped<IIngredientPresetStore, IngredientPresetStore>();
        builder.Services.AddScoped<IGridViewStore, GridViewStore>();

        // Bind JWT settings (secret comes from user-secrets/env, the rest from appsettings).
        builder.Services.Configure<JwtSettings>(
            builder.Configuration.GetSection(JwtSettings.SectionName));
        builder.Services.AddSingleton<ITokenService, JwtTokenService>();

        var jwtSettings = builder.Configuration
            .GetSection(JwtSettings.SectionName)
            .Get<JwtSettings>()
            ?? throw new InvalidOperationException("Missing 'JwtSettings' configuration section.");

        builder.Services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                // Every incoming token must be signed by our key and match the
                // issuer/audience/expiry we minted it with, or it is rejected.
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(jwtSettings.Secret)),
                    ValidateIssuer = true,
                    ValidIssuer = jwtSettings.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwtSettings.Audience,
                    ValidateLifetime = true,
                    // No leeway on expiry; the default 5-minute clock skew would let
                    // expired tokens linger longer than our short lifetime intends.
                    ClockSkew = TimeSpan.Zero,
                };
            });

        var app = builder.Build();

        // Configure the HTTP request pipeline.
        if (app.Environment.IsDevelopment())
        {
            app.MapOpenApi();

            // Serve Swagger UI (Swashbuckle, MIT-licensed / free) against the
            // OpenAPI document produced by MapOpenApi() at /openapi/v1.json.
            app.UseSwaggerUI(options =>
            {
                options.SwaggerEndpoint("/openapi/v1.json", "HoneyWise API v1");
                options.RoutePrefix = "swagger";
            });
        }

        // Skip HTTPS redirection in Development so the Angular dev-server proxy can
        // reach the API over plain http://localhost:20000 (bound by both launch
        // profiles) without chasing a 307 redirect to the https port.
        if (!app.Environment.IsDevelopment())
        {
            app.UseHttpsRedirection();
        }

        // CORS must run before auth so preflight (OPTIONS) requests are answered.
        app.UseCors(WebAppCorsPolicy);

        // Authentication must run before authorization so [Authorize] sees the user.
        app.UseAuthentication();
        app.UseAuthorization();


        app.MapControllers();

        app.Run();
    }
}
