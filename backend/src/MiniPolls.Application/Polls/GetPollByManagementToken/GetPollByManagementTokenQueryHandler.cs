using MediatR;
using MiniPolls.Application.Interfaces;

namespace MiniPolls.Application.Polls.GetPollByManagementToken;

public sealed class GetPollByManagementTokenQueryHandler(IPollRepository pollRepository)
    : IRequestHandler<GetPollByManagementTokenQuery, ManagementPollDto?>
{
    public async Task<ManagementPollDto?> Handle(GetPollByManagementTokenQuery request, CancellationToken cancellationToken)
    {
        var poll = await pollRepository.GetByManagementTokenAsync(request.Token, cancellationToken);

        if (poll is null)
            return null;

        var totalVotes = poll.Options.Sum(o => o.Votes.Count);

        var options = poll.Options
            .OrderBy(o => o.SortOrder)
            .Select(o =>
            {
                var voteCount = o.Votes.Count;
                var percentage = totalVotes > 0 ? (double)voteCount / totalVotes * 100 : 0;
                return new ManagementOptionDto(o.Id, o.Text, o.SortOrder, voteCount, percentage);
            })
            .ToList();

        return new ManagementPollDto(
            poll.Id,
            poll.Question,
            poll.Slug,
            poll.IsClosed,
            poll.ExpiresAt,
            poll.ClosedAt,
            poll.CreatedAt,
            totalVotes,
            options);
    }
}