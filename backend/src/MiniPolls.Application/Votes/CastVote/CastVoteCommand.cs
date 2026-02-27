using MediatR;

namespace MiniPolls.Application.Votes.CastVote;

public sealed record CastVoteCommand(string Slug, Guid OptionId, string IpAddress)
    : IRequest<CastVoteResult>;
