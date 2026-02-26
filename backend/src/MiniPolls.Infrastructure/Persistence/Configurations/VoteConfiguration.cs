using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MiniPolls.Domain.Entities;

namespace MiniPolls.Infrastructure.Persistence.Configurations;

public sealed class VoteConfiguration : IEntityTypeConfiguration<Vote>
{
    public void Configure(EntityTypeBuilder<Vote> builder)
    {
        builder.HasKey(v => v.Id);

        builder.Property(v => v.IpAddress)
            .IsRequired()
            .HasMaxLength(64);

        builder.Property(v => v.CastAt).IsRequired();

        // Ensure one vote per IP per poll option — the duplicate check is done
        // at the application level per poll, but this index prevents DB-level dupes per option.
        builder.HasIndex(v => new { v.PollOptionId, v.IpAddress })
            .IsUnique();
    }
}
