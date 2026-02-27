using FluentAssertions;
using Microsoft.Extensions.Options;
using MiniPolls.Application.Interfaces;
using MiniPolls.Application.Polls.CreatePoll;
using MiniPolls.Application.Polls.Services;
using MiniPolls.Domain.Entities;
using NSubstitute;

namespace MiniPolls.Application.Tests.Polls.CreatePoll;

public sealed class CreatePollCommandHandlerTests
{
    private readonly IPollRepository _pollRepository = Substitute.For<IPollRepository>();
    private readonly IOptions<SlugGenerationOptions> _slugOptions =
        Options.Create(new SlugGenerationOptions { Length = 6 });
    private readonly CreatePollCommandHandler _handler;

    public CreatePollCommandHandlerTests()
    {
        _handler = new CreatePollCommandHandler(_pollRepository, _slugOptions);
    }

    [Fact]
    public async Task Handle_ValidCommand_CreatesPollAndReturnsResult()
    {
        // Arrange
        var command = new CreatePollCommand(
            Question: "Where to eat?",
            Options: ["Pizza", "Sushi", "Tacos"],
            ExpiresAt: null);

        _pollRepository.SlugExistsAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(false);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().NotBeEmpty();
        result.Slug.Should().NotBeNullOrWhiteSpace();
        result.ManagementToken.Should().NotBeNullOrWhiteSpace();
        result.ExpiresAt.Should().BeNull();

        await _pollRepository.Received(1).AddAsync(
            Arg.Is<Poll>(p => p.Question == "Where to eat?" && p.Options.Count == 3),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ValidCommand_GeneratesTokenOfMinLength32()
    {
        // Arrange
        var command = new CreatePollCommand(
            Question: "Test question?",
            Options: ["Yes", "No"],
            ExpiresAt: null);

        _pollRepository.SlugExistsAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(false);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.ManagementToken.Length.Should().BeGreaterThanOrEqualTo(32);
    }

    [Fact]
    public async Task Handle_SlugCollisionOnFirstAttempt_RetriesAndSucceeds()
    {
        // Arrange
        var command = new CreatePollCommand(
            Question: "Retry question?",
            Options: ["Option A", "Option B"],
            ExpiresAt: null);

        _pollRepository.SlugExistsAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(true, false);  // collides on first attempt, succeeds on second

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Slug.Should().NotBeNullOrWhiteSpace();

        await _pollRepository.Received(2).SlugExistsAsync(
            Arg.Any<string>(),
            Arg.Any<CancellationToken>());

        await _pollRepository.Received(1).AddAsync(
            Arg.Any<Poll>(),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ValidCommand_CreatedAtIsPopulated()
    {
        // Arrange
        var before = DateTimeOffset.UtcNow;

        var command = new CreatePollCommand(
            Question: "Timestamp test?",
            Options: ["Yes", "No"],
            ExpiresAt: null);

        _pollRepository.SlugExistsAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(false);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.CreatedAt.Should().BeOnOrAfter(before);
    }
}
