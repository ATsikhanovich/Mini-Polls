using MediatR;

namespace MiniPolls.Application.Polls.SetPollExpiration;

public sealed record SetPollExpirationCommand(string Token, DateTimeOffset ExpiresAt)
    : IRequest<SetPollExpirationResult>;