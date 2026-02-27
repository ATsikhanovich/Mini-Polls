namespace MiniPolls.Application.Polls.ClosePoll;

public sealed record ClosePollResult(Guid Id, bool IsClosed, DateTimeOffset? ClosedAt);