using Mead.Tools;
using HoneyWise.Contracts;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HoneyWise.Api.Controllers.Users;

[ApiController]
[Route("[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IMediator _mediator;

    public UsersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> CreateUser([FromBody] User user, CancellationToken cancellationToken)
    {
        CreateUserResponse response = await _mediator.Send(new CreateUserCommand { User = user }, cancellationToken);

        if (response.Success == false)
        {
            return BadRequest(response.Message);
        }

        return CreatedAtAction(nameof(CreateUser), new { response.Id }, new { response.Id });
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] Login login, CancellationToken cancellationToken)
    {
        LoginCommandResponse response = await _mediator.Send(new LoginCommand { Login = login }, cancellationToken);

        if (response.Success == false)
        {
            return BadRequest(response.Message);
        }

        return Ok(response.Token);
    }

    /// <summary>
    /// Issues a fresh token for the signed-in user, extending their session. The
    /// client calls this while the user is active so the token never lapses out
    /// from under them; an expired token can't reach here, so idle sessions still end.
    /// </summary>
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(CancellationToken cancellationToken)
    {
        string token = await _mediator.Send(
            new RefreshTokenCommand { UserId = this.GetId(), Plan = this.GetPlan() },
            cancellationToken);

        return Ok(token);
    }

    /// <summary>Returns the signed-in user's profile.</summary>
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser(CancellationToken cancellationToken)
    {
        UserProfileResponse? profile =
            await _mediator.Send(new GetCurrentUserQuery { UserId = this.GetId() }, cancellationToken);

        if (profile is null)
        {
            return NotFound();
        }

        return Ok(profile);
    }

    /// <summary>Changes the signed-in user's username.</summary>
    [HttpPut("me/username")]
    public async Task<IActionResult> UpdateUserName(
        [FromBody] UpdateUserNameRequest request,
        CancellationToken cancellationToken)
    {
        GenericResponse response = await _mediator.Send(
            new UpdateUserNameCommand { UserId = this.GetId(), UserName = request.UserName },
            cancellationToken);

        if (response.Success == false)
        {
            return BadRequest(response.Message);
        }

        return NoContent();
    }

    /// <summary>Changes the signed-in user's password.</summary>
    [HttpPut("me/password")]
    public async Task<IActionResult> ChangePassword(
        [FromBody] ChangePasswordRequest request,
        CancellationToken cancellationToken)
    {
        GenericResponse response = await _mediator.Send(
            new ChangePasswordCommand
            {
                UserId = this.GetId(),
                CurrentPassword = request.CurrentPassword,
                NewPassword = request.NewPassword,
            },
            cancellationToken);

        if (response.Success == false)
        {
            return BadRequest(response.Message);
        }

        return NoContent();
    }
}
