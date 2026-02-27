using FluentAssertions;
using MiniPolls.Application.Polls.SetPollExpiration;

namespace MiniPolls.Application.Tests.Polls.SetPollExpiration;

public sealed class SetPollExpirationCommandValidatorTests
{
    private readonly SetPollExpirationCommandValidator _validator = new();

    [Fact]
    public async Task Validate_NonEmptyToken_FutureDate_IsValid()
    {
        var command = new SetPollExpirationCommand("some-token", DateTimeOffset.UtcNow.AddHours(1));

        var result = await _validator.ValidateAsync(command);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_EmptyToken_IsInvalid()
    {
        var command = new SetPollExpirationCommand(string.Empty, DateTimeOffset.UtcNow.AddHours(1));

        var result = await _validator.ValidateAsync(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.PropertyName == nameof(SetPollExpirationCommand.Token));
    }

    [Fact]
    public async Task Validate_PastDate_IsInvalid()
    {
        var command = new SetPollExpirationCommand("some-token", DateTimeOffset.UtcNow.AddMinutes(-10));

        var result = await _validator.ValidateAsync(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e =>
            e.PropertyName == nameof(SetPollExpirationCommand.ExpiresAt)
            && e.ErrorMessage.Contains("future", StringComparison.OrdinalIgnoreCase));
    }
}
