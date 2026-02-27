using MediatR;
using MiniPolls.Application.Interfaces;
using MiniPolls.Domain.Entities;
using MiniPolls.Domain.Exceptions;

namespace MiniPolls.Application.Votes.CastVote;

public sealed class CastVoteCommandHandler(
    IPollRepository pollRepository,
    IVoteRepository voteRepository) : IRequestHandler<CastVoteCommand, CastVoteResult>
{
    public async Task<CastVoteResult> Handle(CastVoteCommand request, CancellationToken cancellationToken)
    {
        var poll = await pollRepository.GetBySlugAsync(request.Slug, cancellationToken);

        if (poll is null)
            throw PollNotFoundException.ForSlug(request.Slug);

        if (poll.IsClosed)
            throw new PollClosedException();

        var optionExists = poll.Options.Any(o => o.Id == request.OptionId);
        if (!optionExists)
            throw new DomainException("Invalid option for this poll.");

        var hasVoted = await voteRepository.HasVotedAsync(poll.Id, request.IpAddress, cancellationToken);
        if (hasVoted)
            throw new DuplicateVoteException();

        var vote = Vote.Create(request.OptionId, request.IpAddress);
        await voteRepository.AddAsync(vote, cancellationToken);

        return new CastVoteResult(vote.Id, vote.PollOptionId, vote.CastAt);
    }
}
