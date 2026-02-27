using MediatR;
using Microsoft.AspNetCore.Mvc;
using MiniPolls.Application.Polls.CreatePoll;

namespace MiniPolls.Api.Controllers;

public sealed record CreatePollRequest(
    string Question,
    List<string> Options,
    DateTimeOffset? ExpiresAt);

[ApiController]
[Route("api/polls")]
public sealed class PollsController(IMediator mediator) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> CreatePoll(
        [FromBody] CreatePollRequest request,
        CancellationToken cancellationToken)
    {
        var command = new CreatePollCommand(
            request.Question,
            request.Options,
            request.ExpiresAt);

        var result = await mediator.Send(command, cancellationToken);

        return Created($"/api/polls/by-slug/{result.Slug}", result);
    }
}
