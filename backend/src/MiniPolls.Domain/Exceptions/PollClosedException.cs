namespace MiniPolls.Domain.Exceptions;

public sealed class PollClosedException()
    : DomainException("This poll is closed and no longer accepting votes.");
