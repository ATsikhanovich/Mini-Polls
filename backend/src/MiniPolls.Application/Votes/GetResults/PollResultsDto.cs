namespace MiniPolls.Application.Votes.GetResults;

public sealed record OptionResultDto(Guid Id, string Text, int VoteCount, double Percentage);

public sealed record PollResultsDto(
    string Question,
    bool IsClosed,
    int TotalVotes,
    IReadOnlyList<OptionResultDto> Options);
