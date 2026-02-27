using MediatR;
using Microsoft.Extensions.Options;
using MiniPolls.Application.Interfaces;
using MiniPolls.Application.Polls.Services;
using MiniPolls.Domain.Entities;

namespace MiniPolls.Application.Polls.CreatePoll;

public sealed class CreatePollCommandHandler(
    IPollRepository pollRepository,
    IOptions<SlugGenerationOptions> slugOptions) : IRequestHandler<CreatePollCommand, CreatePollResult>
{
    private const int MaxSlugRetries = 10;

    public async Task<CreatePollResult> Handle(
        CreatePollCommand request,
        CancellationToken cancellationToken)
    {
        var slugLength = slugOptions.Value.Length;

        var slug = await GenerateUniqueSlugAsync(slugLength, cancellationToken);
        var managementToken = SlugGenerator.GenerateManagementToken();

        var poll = Poll.Create(
            request.Question,
            request.Options,
            slug,
            managementToken,
            request.ExpiresAt);

        await pollRepository.AddAsync(poll, cancellationToken);

        return new CreatePollResult(
            poll.Id,
            poll.Slug,
            poll.ManagementToken,
            poll.CreatedAt,
            poll.ExpiresAt);
    }

    private async Task<string> GenerateUniqueSlugAsync(int length, CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < MaxSlugRetries; attempt++)
        {
            var candidate = SlugGenerator.GenerateSlug(length);

            if (!await pollRepository.SlugExistsAsync(candidate, cancellationToken))
                return candidate;
        }

        throw new InvalidOperationException(
            $"Failed to generate a unique slug after {MaxSlugRetries} attempts.");
    }
}
