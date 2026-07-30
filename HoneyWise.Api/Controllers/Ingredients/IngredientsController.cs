using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HoneyWise.Api.Controllers.Ingredients;

/// <summary>
/// Serves the curated ingredient presets used to populate the recipe form. The
/// list is the same for every signed-in user.
/// </summary>
[ApiController]
[Route("[controller]")]
[Authorize]
public class IngredientsController : ControllerBase
{
    private readonly IMediator _mediator;

    public IngredientsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetPresets(CancellationToken cancellationToken)
    {
        IngredientPresetsResponse presets =
            await _mediator.Send(new GetIngredientPresetsQuery(), cancellationToken);

        return Ok(presets);
    }
}
