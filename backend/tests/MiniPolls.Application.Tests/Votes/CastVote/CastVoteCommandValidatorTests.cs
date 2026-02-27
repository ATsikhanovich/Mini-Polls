using FluentAssertions;
using MiniPolls.Application.Votes.CastVote;

namespace MiniPolls.Application.Tests.Votes.CastVote;

public sealed class CastVoteCommandValidatorTests
{
    private readonly CastVoteCommandValidator _validator = new();

    [Fact]
    public async Task Validate_ValidCommand_Passes()
    {
        // Arrange
        var command = new CastVoteCommand("abc123", Guid.NewGuid(), "1.2.3.4");

        // Act
        var result = await _validator.ValidateAsync(command);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_EmptySlug_Fails()
    {
        // Arrange
        var command = new CastVoteCommand("", Guid.NewGuid(), "1.2.3.4");

        // Act
        var result = await _validator.ValidateAsync(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.PropertyName == nameof(CastVoteCommand.Slug));
    }

    [Fact]
    public async Task Validate_EmptyOptionId_Fails()
    {
        // Arrange
        var command = new CastVoteCommand("abc123", Guid.Empty, "1.2.3.4");

        // Act
        var result = await _validator.ValidateAsync(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.PropertyName == nameof(CastVoteCommand.OptionId));
    }

    [Fact]
    public async Task Validate_EmptyIpAddress_Fails()
    {
        // Arrange
        var command = new CastVoteCommand("abc123", Guid.NewGuid(), "");

        // Act
        var result = await _validator.ValidateAsync(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.PropertyName == nameof(CastVoteCommand.IpAddress));
    }
}
