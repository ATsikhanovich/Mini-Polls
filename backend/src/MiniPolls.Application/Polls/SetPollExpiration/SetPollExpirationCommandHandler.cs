using MediatR;
using MiniPolls.Application.Interfaces;
using MiniPolls.Domain.Exceptions;

namespace MiniPolls.Application.Polls.SetPollExpiration;

public sealed class SetPollExpirationCommandHandler(IPollRepository pollRepository)
    : IRequestHandler<SetPollExpirationCommand, SetPollExpirationResult>
{
    public async Task<SetPollExpirationResult> Handle(
        SetPollExpirationCommand request,
        CancellationToken cancellationToken)
    {
        var poll = await pollRepository.GetByManagementTokenAsync(request.Token, cancellationToken);

        if (poll is null)
            throw new PollNotFoundException(request.Token);

        poll.SetExpiration(request.ExpiresAt);
        await pollRepository.UpdateAsync(poll, cancellationToken);

        return new SetPollExpirationResult(poll.Id, poll.ExpiresAt);
    }
}