using MediatR;

namespace MiniPolls.Application.Votes.CheckVote;

public sealed record CheckVoteQuery(string Slug, string IpAddress) : IRequest<bool>;
