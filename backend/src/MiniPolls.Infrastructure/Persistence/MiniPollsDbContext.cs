using Microsoft.EntityFrameworkCore;
using MiniPolls.Domain.Entities;
using MiniPolls.Infrastructure.Persistence.Configurations;

namespace MiniPolls.Infrastructure.Persistence;

public sealed class MiniPollsDbContext(DbContextOptions<MiniPollsDbContext> options) : DbContext(options)
{
    public DbSet<Poll> Polls => Set<Poll>();
    public DbSet<PollOption> PollOptions => Set<PollOption>();
    public DbSet<Vote> Votes => Set<Vote>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new PollConfiguration());
        modelBuilder.ApplyConfiguration(new PollOptionConfiguration());
        modelBuilder.ApplyConfiguration(new VoteConfiguration());

        base.OnModelCreating(modelBuilder);
    }
}
