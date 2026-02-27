using FluentAssertions;
using MiniPolls.Application.Polls.ClosePoll;

namespace MiniPolls.Application.Tests.Polls.ClosePoll;

public sealed class ClosePollCommandValidatorTests
{
    private readonly ClosePollCommandValidator _validator = new();

    [Fact]
    public async Task Validate_NonEmptyToken_IsValid()
    {
        // Arrange
        var command = new ClosePollCommand("some-token");

        // Act
        var result = await _validator.ValidateAsync(command);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_EmptyToken_IsInvalid()
    {
        // Arrange
        var command = new ClosePollCommand(string.Empty);

        // Act
        var result = await _validator.ValidateAsync(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.PropertyName == nameof(ClosePollCommand.Token));
    }
}