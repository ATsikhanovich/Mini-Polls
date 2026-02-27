using MediatR;
using MiniPolls.Application.Interfaces;
using MiniPolls.Domain.Exceptions;

namespace MiniPolls.Application.Votes.GetResults;

public sealed class GetResultsQueryHandler(IPollRepository pollRepository)
    : IRequestHandler<GetResultsQuery, PollResultsDto>
{
    public async Task<PollResultsDto> Handle(GetResultsQuery request, CancellationToken cancellationToken)
    {
        var poll = await pollRepository.GetBySlugAsync(request.Slug, cancellationToken);

        if (poll is null)
            throw PollNotFoundException.ForSlug(request.Slug);

        var totalVotes = poll.Options.Sum(o => o.Votes.Count);

        var options = poll.Options
            .OrderBy(o => o.SortOrder)
            .Select(o =>
            {
                var voteCount = o.Votes.Count;
                var percentage = totalVotes > 0 ? (double)voteCount / totalVotes * 100 : 0;
                return new OptionResultDto(o.Id, o.Text, voteCount, percentage);
            })
            .ToList();

        return new PollResultsDto(poll.Question, poll.IsClosed, totalVotes, options);
    }
}
