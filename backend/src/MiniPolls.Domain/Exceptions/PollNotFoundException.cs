namespace MiniPolls.Domain.Exceptions;

public sealed class PollNotFoundException(string slug)
    : DomainException($"Poll with slug '{slug}' was not found.");
