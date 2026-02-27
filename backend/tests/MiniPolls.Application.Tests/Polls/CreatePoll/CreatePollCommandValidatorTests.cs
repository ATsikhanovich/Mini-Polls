using FluentAssertions;
using FluentValidation;
using MiniPolls.Application.Polls.CreatePoll;

namespace MiniPolls.Application.Tests.Polls.CreatePoll;

public sealed class CreatePollCommandValidatorTests
{
    private readonly CreatePollCommandValidator _validator = new();

    [Fact]
    public async Task Validate_ValidCommand_Passes()
    {
        // Arrange
        var command = new CreatePollCommand(
            Question: "Where should we eat?",
            Options: ["Pizza", "Sushi"],
            ExpiresAt: null);

        // Act
        var result = await _validator.ValidateAsync(command);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_EmptyQuestion_Fails()
    {
        // Arrange
        var command = new CreatePollCommand(
            Question: "   ",
            Options: ["Pizza", "Sushi"],
            ExpiresAt: null);

        // Act
        var result = await _validator.ValidateAsync(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.PropertyName == nameof(CreatePollCommand.Question));
    }

    [Fact]
    public async Task Validate_FewerThanTwoOptions_Fails()
    {
        // Arrange
        var command = new CreatePollCommand(
            Question: "Where to eat?",
            Options: ["Pizza"],
            ExpiresAt: null);

        // Act
        var result = await _validator.ValidateAsync(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.PropertyName == nameof(CreatePollCommand.Options));
    }

    [Fact]
    public async Task Validate_EmptyOptionText_Fails()
    {
        // Arrange
        var command = new CreatePollCommand(
            Question: "Where to eat?",
            Options: ["Pizza", "   "],
            ExpiresAt: null);

        // Act
        var result = await _validator.ValidateAsync(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName.Contains(nameof(CreatePollCommand.Options)));
    }

    [Fact]
    public async Task Validate_PastExpiration_Fails()
    {
        // Arrange
        var command = new CreatePollCommand(
            Question: "Where to eat?",
            Options: ["Pizza", "Sushi"],
            ExpiresAt: DateTimeOffset.UtcNow.AddDays(-1));

        // Act
        var result = await _validator.ValidateAsync(command);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.PropertyName == nameof(CreatePollCommand.ExpiresAt));
    }

    [Fact]
    public async Task Validate_FutureExpiration_Passes()
    {
        // Arrange
        var command = new CreatePollCommand(
            Question: "Where to eat?",
            Options: ["Pizza", "Sushi"],
            ExpiresAt: DateTimeOffset.UtcNow.AddDays(1));

        // Act
        var result = await _validator.ValidateAsync(command);

        // Assert
        result.IsValid.Should().BeTrue();
    }
}
