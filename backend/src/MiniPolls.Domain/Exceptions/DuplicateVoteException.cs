namespace MiniPolls.Domain.Exceptions;

public sealed class DuplicateVoteException()
    : DomainException("You have already voted on this poll.");
