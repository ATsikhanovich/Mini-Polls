using MediatR;
using MiniPolls.Application.Interfaces;
using MiniPolls.Domain.Exceptions;

namespace MiniPolls.Application.Polls.ClosePoll;

public sealed class ClosePollCommandHandler(IPollRepository pollRepository)
    : IRequestHandler<ClosePollCommand, ClosePollResult>
{
    public async Task<ClosePollResult> Handle(ClosePollCommand request, CancellationToken cancellationToken)
    {
        var poll = await pollRepository.GetByManagementTokenAsync(request.Token, cancellationToken);

        if (poll is null)
            throw new PollNotFoundException(request.Token);

        poll.Close();
        await pollRepository.UpdateAsync(poll, cancellationToken);

        return new ClosePollResult(poll.Id, poll.IsClosed, poll.ClosedAt);
    }
}