namespace MiniPolls.Application.Votes.CastVote;

public sealed record CastVoteResult(Guid VoteId, Guid PollOptionId, DateTimeOffset CastAt);
