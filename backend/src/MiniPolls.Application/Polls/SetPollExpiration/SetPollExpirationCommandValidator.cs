using FluentValidation;

namespace MiniPolls.Application.Polls.SetPollExpiration;

public sealed class SetPollExpirationCommandValidator : AbstractValidator<SetPollExpirationCommand>
{
    public SetPollExpirationCommandValidator()
    {
        RuleFor(x => x.Token).NotEmpty();

        RuleFor(x => x.ExpiresAt)
            .Must(expiresAt => expiresAt > DateTimeOffset.UtcNow)
            .WithMessage("Expiration date must be in the future.");
    }
}