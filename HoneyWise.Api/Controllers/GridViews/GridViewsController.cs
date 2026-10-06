using HoneyWise.Contracts;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HoneyWise.Api.Controllers.GridViews;

/// <summary>
/// CRUD for the signed-in user's saved grid views. Every action is scoped to the
/// current user (resolved from the JWT), so a caller only ever sees or mutates
/// their own views.
/// </summary>
[ApiController]
[Route("[controller]")]
[Authorize]
public class GridViewsController : ControllerBase
{
    private readonly IMediator _mediator;

    public GridViewsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>Lists the user's views for one grid, e.g. <c>GET /GridViews?gridKey=recipes</c>.</summary>
    [HttpGet]
    public async Task<IActionResult> GetGridViews([FromQuery] string gridKey, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(gridKey))
        {
            return BadRequest("GridKey is required. ");
        }

        IReadOnlyList<GridView> views = await _mediator.Send(
            new GetGridViewsQuery { UserId = this.GetId(), GridKey = gridKey }, cancellationToken);

        return Ok(views);
    }

    [HttpPost]
    public async Task<IActionResult> CreateGridView([FromBody] GridViewInput view, CancellationToken cancellationToken)
    {
        CreateGridViewResponse response = await _mediator.Send(
            new CreateGridViewCommand { View = view, UserId = this.GetId() }, cancellationToken);

        if (response.Success == false)
        {
            return BadRequest(response.Message);
        }

        return CreatedAtAction(nameof(GetGridViews), new { gridKey = view.GridKey }, new { response.Id });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateGridView(
        Guid id, [FromBody] GridViewInput view, CancellationToken cancellationToken)
    {
        UpdateGridViewResponse response = await _mediator.Send(
            new UpdateGridViewCommand { ViewId = id, View = view, UserId = this.GetId() },
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
    public async Task<IActionResult> DeleteGridView(Guid id, CancellationToken cancellationToken)
    {
        DeleteGridViewResponse response = await _mediator.Send(
            new DeleteGridViewCommand { ViewId = id, UserId = this.GetId() }, cancellationToken);

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
}
