using MiniPolls.Domain.Entities;

namespace MiniPolls.Application.Interfaces;

public interface IVoteRepository
{
    Task<bool> HasVotedAsync(Guid pollId, string ipAddress, CancellationToken cancellationToken = default);
    Task AddAsync(Vote vote, CancellationToken cancellationToken = default);
}
