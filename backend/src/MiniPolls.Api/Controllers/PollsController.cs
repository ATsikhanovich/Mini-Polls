using MediatR;
using Microsoft.AspNetCore.Mvc;
using MiniPolls.Application.Polls.CreatePoll;
using MiniPolls.Application.Polls.GetPollBySlug;
using MiniPolls.Application.Votes.CastVote;
using MiniPolls.Application.Votes.CheckVote;
using MiniPolls.Application.Votes.GetResults;
using MiniPolls.Domain.Exceptions;

namespace MiniPolls.Api.Controllers;

public sealed record CreatePollRequest(
    string Question,
    List<string> Options,
    DateTimeOffset? ExpiresAt);

public sealed record CastVoteRequest(Guid OptionId);

public sealed record DuplicateVoteResponse(
    string Message,
    PollResultsDto Results);

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

    [HttpGet("by-slug/{slug}")]
    public async Task<IActionResult> GetPollBySlug(string slug, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetPollBySlugQuery(slug), cancellationToken);

        if (result is null)
            return NotFound();

        return Ok(result);
    }

    [HttpPost("{slug}/votes")]
    public async Task<IActionResult> CastVote(
        string slug,
        [FromBody] CastVoteRequest request,
        CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var command = new CastVoteCommand(slug, request.OptionId, ipAddress);

        try
        {
            var result = await mediator.Send(command, cancellationToken);
            return Ok(result);
        }
        catch (DuplicateVoteException)
        {
            var results = await mediator.Send(new GetResultsQuery(slug), cancellationToken);
            return Conflict(new DuplicateVoteResponse("You have already voted on this poll.", results!));
        }
    }

    [HttpGet("{slug}/results")]
    public async Task<IActionResult> GetResults(string slug, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetResultsQuery(slug), cancellationToken);

        if (result is null)
            return NotFound();

        return Ok(result);
    }

    [HttpGet("{slug}/vote-check")]
    public async Task<IActionResult> CheckVote(string slug, CancellationToken cancellationToken)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var hasVoted = await mediator.Send(new CheckVoteQuery(slug, ipAddress), cancellationToken);
        return Ok(new { hasVoted });
    }
}
