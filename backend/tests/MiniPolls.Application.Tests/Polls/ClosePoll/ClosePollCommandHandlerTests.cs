using FluentAssertions;
using MiniPolls.Application.Interfaces;
using MiniPolls.Application.Polls.ClosePoll;
using MiniPolls.Domain.Entities;
using MiniPolls.Domain.Exceptions;
using NSubstitute;

namespace MiniPolls.Application.Tests.Polls.ClosePoll;

public sealed class ClosePollCommandHandlerTests
{
    private readonly IPollRepository _pollRepository = Substitute.For<IPollRepository>();
    private readonly ClosePollCommandHandler _handler;

    public ClosePollCommandHandlerTests()
    {
        _handler = new ClosePollCommandHandler(_pollRepository);
    }

    [Fact]
    public async Task Handle_ValidToken_ActivePoll_ClosesPollAndReturnsResult()
    {
        // Arrange
        var poll = Poll.Create("Best colour?", ["Red", "Blue"], "col12", "mgmt-token");
        _pollRepository.GetByManagementTokenAsync("mgmt-token", Arg.Any<CancellationToken>())
            .Returns(poll);

        // Act
        var result = await _handler.Handle(new ClosePollCommand("mgmt-token"), CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(poll.Id);
        result.IsClosed.Should().BeTrue();
        result.ClosedAt.Should().NotBeNull();
        result.ClosedAt.Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromSeconds(5));

        await _pollRepository.Received(1).UpdateAsync(poll, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ValidToken_AlreadyClosedPoll_ReturnsResultWithoutError()
    {
        // Arrange
        var poll = Poll.Create("Already closed?", ["Yes", "No"], "cls12", "mgmt-closed");
        poll.Close();

        _pollRepository.GetByManagementTokenAsync("mgmt-closed", Arg.Any<CancellationToken>())
            .Returns(poll);

        // Act
        var result = await _handler.Handle(new ClosePollCommand("mgmt-closed"), CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.IsClosed.Should().BeTrue();
        result.ClosedAt.Should().NotBeNull();
        await _pollRepository.Received(1).UpdateAsync(poll, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_InvalidToken_ThrowsPollNotFoundException()
    {
        // Arrange
        _pollRepository.GetByManagementTokenAsync("missing", Arg.Any<CancellationToken>())
            .Returns((Poll?)null);

        // Act
        var act = () => _handler.Handle(new ClosePollCommand("missing"), CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<PollNotFoundException>();
    }

    [Fact]
    public async Task Handle_ValidToken_CallsUpdateAsyncExactlyOnce()
    {
        // Arrange
        var poll = Poll.Create("Persist close?", ["A", "B"], "upd12", "mgmt-update");
        _pollRepository.GetByManagementTokenAsync("mgmt-update", Arg.Any<CancellationToken>())
            .Returns(poll);

        // Act
        await _handler.Handle(new ClosePollCommand("mgmt-update"), CancellationToken.None);

        // Assert
        await _pollRepository.Received(1).UpdateAsync(
            Arg.Is<Poll>(p => p == poll),
            Arg.Any<CancellationToken>());
    }
}