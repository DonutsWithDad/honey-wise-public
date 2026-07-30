using System.Text;
using Mead.Tools;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HoneyWise.Api.Controllers.Recipes;

/// <summary>
/// CRUD + export for the signed-in user's mead recipes. Every action is scoped to
/// the current user (resolved from the JWT), so a caller only ever sees or mutates
/// their own recipes.
/// </summary>
[ApiController]
[Route("[controller]")]
[Authorize]
public class RecipesController : ControllerBase
{
    private readonly IMediator _mediator;

    public RecipesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetRecipes(CancellationToken cancellationToken)
    {
        IReadOnlyList<RecipeSummary> recipes =
            await _mediator.Send(new GetRecipesQuery { UserId = this.GetId() }, cancellationToken);

        return Ok(recipes);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetRecipe(Guid id, CancellationToken cancellationToken)
    {
        Recipe? recipe = await _mediator.Send(
            new GetRecipeQuery { RecipeId = id, UserId = this.GetId() }, cancellationToken);

        return recipe is null ? NotFound() : Ok(recipe);
    }

    [HttpPost]
    public async Task<IActionResult> CreateRecipe([FromBody] Recipe recipe, CancellationToken cancellationToken)
    {
        CreateRecipeResponse response = await _mediator.Send(
            new CreateRecipeCommand { Recipe = recipe, UserId = this.GetId() }, cancellationToken);

        if (response.Success == false)
        {
            return BadRequest(response.Message);
        }

        return CreatedAtAction(nameof(GetRecipe), new { id = response.Id }, new { response.Id });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateRecipe(
        Guid id, [FromBody] Recipe recipe, CancellationToken cancellationToken)
    {
        UpdateRecipeResponse response = await _mediator.Send(
            new UpdateRecipeCommand { RecipeId = id, Recipe = recipe, UserId = this.GetId() },
            cancellationToken);

        if (response.NotFound)
        {
            return NotFound();
        }

        if (response.Success == false)
        {
            return BadRequest(response.Message);
        }

        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteRecipe(Guid id, CancellationToken cancellationToken)
    {
        DeleteRecipeResponse response = await _mediator.Send(
            new DeleteRecipeCommand { RecipeId = id, UserId = this.GetId() }, cancellationToken);

        if (response.NotFound)
        {
            return NotFound();
        }

        if (response.Success == false)
        {
            return BadRequest(response.Message);
        }

        return NoContent();
    }

    [HttpGet("{id:guid}/export")]
    public async Task<IActionResult> ExportRecipe(Guid id, CancellationToken cancellationToken)
    {
        ExportRecipeResult? result = await _mediator.Send(
            new ExportRecipeQuery { RecipeId = id, UserId = this.GetId() }, cancellationToken);

        if (result is null)
        {
            return NotFound();
        }

        var bytes = Encoding.UTF8.GetBytes(result.Xml);
        return File(bytes, "application/xml", $"{SanitizeFileName(result.Name)}.xml");
    }

    /// <summary>Strips characters that aren't safe in a download filename.</summary>
    private static string SanitizeFileName(string name)
    {
        var cleaned = new string(name
            .Select(c => Path.GetInvalidFileNameChars().Contains(c) ? '_' : c)
            .ToArray())
            .Trim();

        return string.IsNullOrWhiteSpace(cleaned) ? "recipe" : cleaned;
    }
}
