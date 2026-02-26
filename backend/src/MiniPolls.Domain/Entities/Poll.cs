using MiniPolls.Domain.Exceptions;

namespace MiniPolls.Domain.Entities;

public sealed class Poll
{
    private readonly List<PollOption> _options = [];

    public Guid Id { get; private set; }
    public string Question { get; private set; }
    public string Slug { get; private set; }
    public string ManagementToken { get; private set; }
    public DateTimeOffset? ExpiresAt { get; private set; }
    public DateTimeOffset? ClosedAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    // Navigation
    public IReadOnlyCollection<PollOption> Options => _options.AsReadOnly();

    public bool IsClosed =>
        ClosedAt.HasValue || (ExpiresAt.HasValue && ExpiresAt.Value <= DateTimeOffset.UtcNow);

    private Poll()
    {
        Question = string.Empty;
        Slug = string.Empty;
        ManagementToken = string.Empty;
    }

    public static Poll Create(
        string question,
        IReadOnlyList<string> optionTexts,
        string slug,
        string managementToken,
        DateTimeOffset? expiresAt = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(question);
        ArgumentException.ThrowIfNullOrWhiteSpace(slug);
        ArgumentException.ThrowIfNullOrWhiteSpace(managementToken);

        if (optionTexts is null || optionTexts.Count < 2)
            throw new DomainException("A poll must have at least two options.");

        if (optionTexts.Any(o => string.IsNullOrWhiteSpace(o)))
            throw new DomainException("All poll options must have non-empty text.");

        if (expiresAt.HasValue && expiresAt.Value <= DateTimeOffset.UtcNow)
            throw new DomainException("Expiration date must be in the future.");

        var poll = new Poll
        {
            Id = Guid.NewGuid(),
            Question = question.Trim(),
            Slug = slug,
            ManagementToken = managementToken,
            ExpiresAt = expiresAt,
            CreatedAt = DateTimeOffset.UtcNow
        };

        for (int i = 0; i < optionTexts.Count; i++)
        {
            poll._options.Add(PollOption.Create(poll.Id, optionTexts[i], i));
        }

        return poll;
    }

    public void Close()
    {
        if (IsClosed)
            return;

        ClosedAt = DateTimeOffset.UtcNow;
    }

    public void SetExpiration(DateTimeOffset expiresAt)
    {
        if (IsClosed)
            throw new DomainException("Cannot set expiration on a closed poll.");

        if (expiresAt <= DateTimeOffset.UtcNow)
            throw new DomainException("Expiration date must be in the future.");

        ExpiresAt = expiresAt;
    }
}
