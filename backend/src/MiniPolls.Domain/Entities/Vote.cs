namespace MiniPolls.Domain.Entities;

public sealed class Vote
{
    public Guid Id { get; private set; }
    public Guid PollOptionId { get; private set; }
    public string IpAddress { get; private set; }
    public DateTimeOffset CastAt { get; private set; }

    // Navigation
    public PollOption? Option { get; private set; }

    private Vote() 
    { 
        IpAddress = string.Empty;
    }

    public static Vote Create(Guid pollOptionId, string ipAddress)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(ipAddress);

        return new Vote
        {
            Id = Guid.NewGuid(),
            PollOptionId = pollOptionId,
            IpAddress = ipAddress,
            CastAt = DateTimeOffset.UtcNow
        };
    }
}
