using FluentValidation;

namespace MiniPolls.Application.Polls.CreatePoll;

public sealed class CreatePollCommandValidator : AbstractValidator<CreatePollCommand>
{
    public CreatePollCommandValidator()
    {
        RuleFor(x => x.Question)
            .NotEmpty()
            .WithMessage("Question must not be empty.");

        RuleFor(x => x.Options)
            .NotNull()
            .Must(opts => opts is not null && opts.Count >= 2)
            .WithMessage("At least two answer options are required.");

        RuleForEach(x => x.Options)
            .NotEmpty()
            .WithMessage("Each option must have non-empty text.");

        RuleFor(x => x.ExpiresAt)
            .Must(expiresAt => expiresAt is null || expiresAt.Value > DateTimeOffset.UtcNow)
            .WithMessage("Expiration date must be in the future.")
            .When(x => x.ExpiresAt.HasValue);
    }
}
