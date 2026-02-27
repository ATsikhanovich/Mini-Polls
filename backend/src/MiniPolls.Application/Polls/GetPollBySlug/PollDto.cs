namespace MiniPolls.Application.Polls.GetPollBySlug;

public sealed record PollOptionDto(Guid Id, string Text, int SortOrder);

public sealed record PollDto(
    Guid Id,
    string Question,
    string Slug,
    bool IsClosed,
    DateTimeOffset? ExpiresAt,
    DateTimeOffset CreatedAt,
    IReadOnlyList<PollOptionDto> Options);
