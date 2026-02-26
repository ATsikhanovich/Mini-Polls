namespace MiniPolls.Domain.Entities;

public sealed class PollOption
{
    private readonly List<Vote> _votes = [];

    public Guid Id { get; private set; }
    public Guid PollId { get; private set; }
    public string Text { get; private set; }
    public int SortOrder { get; private set; }

    // Navigation
    public Poll? Poll { get; private set; }
    public IReadOnlyCollection<Vote> Votes => _votes.AsReadOnly();

    private PollOption()
    {
        Text = string.Empty;
    }

    public static PollOption Create(Guid pollId, string text, int sortOrder)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(text);

        return new PollOption
        {
            Id = Guid.NewGuid(),
            PollId = pollId,
            Text = text.Trim(),
            SortOrder = sortOrder
        };
    }
}
