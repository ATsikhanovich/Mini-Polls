using FluentValidation;

namespace MiniPolls.Application.Votes.CastVote;

public sealed class CastVoteCommandValidator : AbstractValidator<CastVoteCommand>
{
    public CastVoteCommandValidator()
    {
        RuleFor(x => x.Slug).NotEmpty();
        RuleFor(x => x.OptionId).NotEqual(Guid.Empty);
        RuleFor(x => x.IpAddress).NotEmpty();
    }
}
