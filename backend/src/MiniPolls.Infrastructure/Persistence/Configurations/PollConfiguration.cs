using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MiniPolls.Domain.Entities;

namespace MiniPolls.Infrastructure.Persistence.Configurations;

public sealed class PollConfiguration : IEntityTypeConfiguration<Poll>
{
    public void Configure(EntityTypeBuilder<Poll> builder)
    {
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Question)
            .IsRequired()
            .HasMaxLength(1000);

        builder.Property(p => p.Slug)
            .IsRequired()
            .HasMaxLength(16);

        builder.HasIndex(p => p.Slug)
            .IsUnique();

        builder.Property(p => p.ManagementToken)
            .IsRequired()
            .HasMaxLength(128);

        builder.HasIndex(p => p.ManagementToken)
            .IsUnique();

        builder.Property(p => p.ExpiresAt);
        builder.Property(p => p.ClosedAt);
        builder.Property(p => p.CreatedAt).IsRequired();

        builder.HasMany(p => p.Options)
            .WithOne(o => o.Poll)
            .HasForeignKey(o => o.PollId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
