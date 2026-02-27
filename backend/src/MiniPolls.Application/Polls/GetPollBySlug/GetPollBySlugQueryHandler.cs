using MediatR;
using MiniPolls.Application.Interfaces;
using MiniPolls.Domain.Exceptions;

namespace MiniPolls.Application.Polls.GetPollBySlug;

public sealed class GetPollBySlugQueryHandler(IPollRepository pollRepository)
    : IRequestHandler<GetPollBySlugQuery, PollDto>
{
    public async Task<PollDto> Handle(GetPollBySlugQuery request, CancellationToken cancellationToken)
    {
        var poll = await pollRepository.GetBySlugAsync(request.Slug, cancellationToken);

        if (poll is null)
            throw PollNotFoundException.ForSlug(request.Slug);

        var options = poll.Options
            .OrderBy(o => o.SortOrder)
            .Select(o => new PollOptionDto(o.Id, o.Text, o.SortOrder))
            .ToList();

        return new PollDto(
            poll.Id,
            poll.Question,
            poll.Slug,
            poll.IsClosed,
            poll.ExpiresAt,
            poll.CreatedAt,
            options);
    }
}
