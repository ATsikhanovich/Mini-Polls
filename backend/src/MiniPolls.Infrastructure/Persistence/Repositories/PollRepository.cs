using Microsoft.EntityFrameworkCore;
using MiniPolls.Application.Interfaces;
using MiniPolls.Domain.Entities;
using MiniPolls.Infrastructure.Persistence;

namespace MiniPolls.Infrastructure.Persistence.Repositories;

public sealed class PollRepository(MiniPollsDbContext context) : IPollRepository
{
    public async Task<Poll?> GetBySlugAsync(string slug, CancellationToken cancellationToken = default)
        => await context.Polls
            .Include(p => p.Options)
                .ThenInclude(o => o.Votes)
            .FirstOrDefaultAsync(p => p.Slug == slug, cancellationToken);

    public async Task<Poll?> GetByManagementTokenAsync(string token, CancellationToken cancellationToken = default)
        => await context.Polls
            .Include(p => p.Options)
                .ThenInclude(o => o.Votes)
            .FirstOrDefaultAsync(p => p.ManagementToken == token, cancellationToken);

    public async Task<bool> SlugExistsAsync(string slug, CancellationToken cancellationToken = default)
        => await context.Polls.AnyAsync(p => p.Slug == slug, cancellationToken);

    public async Task AddAsync(Poll poll, CancellationToken cancellationToken = default)
    {
        await context.Polls.AddAsync(poll, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(Poll poll, CancellationToken cancellationToken = default)
    {
        context.Polls.Update(poll);
        await context.SaveChangesAsync(cancellationToken);
    }
}
