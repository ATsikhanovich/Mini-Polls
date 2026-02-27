using FluentValidation;

namespace MiniPolls.Application.Polls.ClosePoll;

public sealed class ClosePollCommandValidator : AbstractValidator<ClosePollCommand>
{
    public ClosePollCommandValidator()
    {
        RuleFor(x => x.Token).NotEmpty();
    }
}