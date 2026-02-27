namespace MiniPolls.Application.Polls.CreatePoll;

public sealed record CreatePollResult(
    Guid Id,
    string Slug,
    string ManagementToken,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ExpiresAt);
