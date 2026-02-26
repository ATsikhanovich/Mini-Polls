using MiniPolls.Domain.Entities;

namespace MiniPolls.Application.Interfaces;

public interface IPollRepository
{
    Task<Poll?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default);
    Task<Poll?> GetByManagementTokenAsync(string token, CancellationToken cancellationToken = default);
    Task<bool> SlugExistsAsync(string slug, CancellationToken cancellationToken = default);
    Task AddAsync(Poll poll, CancellationToken cancellationToken = default);
    Task UpdateAsync(Poll poll, CancellationToken cancellationToken = default);
}
