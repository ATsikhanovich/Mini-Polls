using MediatR;
using MiniPolls.Application.Interfaces;
using MiniPolls.Domain.Exceptions;

namespace MiniPolls.Application.Votes.CheckVote;

public sealed class CheckVoteQueryHandler(
    IPollRepository pollRepository,
    IVoteRepository voteRepository) : IRequestHandler<CheckVoteQuery, bool>
{
    public async Task<bool> Handle(CheckVoteQuery request, CancellationToken cancellationToken)
    {
        var poll = await pollRepository.GetBySlugAsync(request.Slug, cancellationToken);

        if (poll is null)
            throw new PollNotFoundException(request.Slug);

        return await voteRepository.HasVotedAsync(poll.Id, request.IpAddress, cancellationToken);
    }
}
