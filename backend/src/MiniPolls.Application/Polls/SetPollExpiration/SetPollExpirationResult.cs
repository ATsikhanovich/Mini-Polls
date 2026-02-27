namespace MiniPolls.Application.Polls.SetPollExpiration;

public sealed record SetPollExpirationResult(Guid Id, DateTimeOffset? ExpiresAt);