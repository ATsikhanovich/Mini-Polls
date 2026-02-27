using MediatR;

namespace MiniPolls.Application.Polls.GetPollBySlug;

public sealed record GetPollBySlugQuery(string Slug) : IRequest<PollDto>;
