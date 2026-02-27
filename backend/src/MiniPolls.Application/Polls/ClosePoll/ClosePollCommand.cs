using MediatR;

namespace MiniPolls.Application.Polls.ClosePoll;

public sealed record ClosePollCommand(string Token) : IRequest<ClosePollResult>;