using MediatR;

namespace MiniPolls.Application.Votes.GetResults;

public sealed record GetResultsQuery(string Slug) : IRequest<PollResultsDto>;
