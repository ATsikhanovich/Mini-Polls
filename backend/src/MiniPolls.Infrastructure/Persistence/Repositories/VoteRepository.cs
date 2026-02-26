using Microsoft.EntityFrameworkCore;
using MiniPolls.Application.Interfaces;
using MiniPolls.Domain.Entities;
using MiniPolls.Infrastructure.Persistence;

namespace MiniPolls.Infrastructure.Persistence.Repositories;

public sealed class VoteRepository(MiniPollsDbContext context) : IVoteRepository
{
    public async Task<bool> HasVotedAsync(Guid pollId, string ipAddress, CancellationToken cancellationToken = default)
        => await context.Votes
            .AnyAsync(
                v => v.Option!.PollId == pollId && v.IpAddress == ipAddress,
                cancellationToken);

    public async Task AddAsync(Vote vote, CancellationToken cancellationToken = default)
    {
        await context.Votes.AddAsync(vote, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
    }
}
