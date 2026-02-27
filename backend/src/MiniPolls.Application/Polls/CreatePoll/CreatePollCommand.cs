using MediatR;

namespace MiniPolls.Application.Polls.CreatePoll;

public sealed record CreatePollCommand(
    string Question,
    IReadOnlyList<string> Options,
    DateTimeOffset? ExpiresAt) : IRequest<CreatePollResult>;
