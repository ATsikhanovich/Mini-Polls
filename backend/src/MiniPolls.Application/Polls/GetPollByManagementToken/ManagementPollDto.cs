namespace MiniPolls.Application.Polls.GetPollByManagementToken;

public sealed record ManagementOptionDto(
    Guid Id,
    string Text,
    int SortOrder,
    int VoteCount,
    double Percentage);

public sealed record ManagementPollDto(
    Guid Id,
    string Question,
    string Slug,
    bool IsClosed,
    DateTimeOffset? ExpiresAt,
    DateTimeOffset? ClosedAt,
    DateTimeOffset CreatedAt,
    int TotalVotes,
    IReadOnlyList<ManagementOptionDto> Options);