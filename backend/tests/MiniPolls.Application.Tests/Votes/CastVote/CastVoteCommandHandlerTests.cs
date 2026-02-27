using FluentAssertions;
using MiniPolls.Application.Interfaces;
using MiniPolls.Application.Votes.CastVote;
using MiniPolls.Domain.Entities;
using MiniPolls.Domain.Exceptions;
using NSubstitute;

namespace MiniPolls.Application.Tests.Votes.CastVote;

public sealed class CastVoteCommandHandlerTests
{
    private readonly IPollRepository _pollRepository = Substitute.For<IPollRepository>();
    private readonly IVoteRepository _voteRepository = Substitute.For<IVoteRepository>();
    private readonly CastVoteCommandHandler _handler;

    public CastVoteCommandHandlerTests()
    {
        _handler = new CastVoteCommandHandler(_pollRepository, _voteRepository);
    }

    [Fact]
    public async Task Handle_ValidVote_CreatesVoteAndReturnsResult()
    {
        // Arrange
        var poll = Poll.Create("What is best?", ["Option A", "Option B"], "abc123", "mgmt-token-xyz");
        var optionId = poll.Options.First().Id;

        _pollRepository.GetBySlugAsync("abc123", Arg.Any<CancellationToken>()).Returns(poll);
        _voteRepository.HasVotedAsync(poll.Id, "1.2.3.4", Arg.Any<CancellationToken>()).Returns(false);

        var command = new CastVoteCommand("abc123", optionId, "1.2.3.4");

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.PollOptionId.Should().Be(optionId);
        result.VoteId.Should().NotBeEmpty();

        await _voteRepository.Received(1).AddAsync(
            Arg.Is<Vote>(v => v.PollOptionId == optionId && v.IpAddress == "1.2.3.4"),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_PollNotFound_ThrowsPollNotFoundException()
    {
        // Arrange
        _pollRepository.GetBySlugAsync("no-such-slug", Arg.Any<CancellationToken>()).Returns((Poll?)null);

        var command = new CastVoteCommand("no-such-slug", Guid.NewGuid(), "1.2.3.4");

        // Act
        var act = () => _handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<PollNotFoundException>();
    }

    [Fact]
    public async Task Handle_PollClosed_ThrowsPollClosedException()
    {
        // Arrange
        var poll = Poll.Create("What is best?", ["Option A", "Option B"], "closed-poll", "mgmt-token");
        poll.Close();
        var optionId = poll.Options.First().Id;

        _pollRepository.GetBySlugAsync("closed-poll", Arg.Any<CancellationToken>()).Returns(poll);

        var command = new CastVoteCommand("closed-poll", optionId, "1.2.3.4");

        // Act
        var act = () => _handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<PollClosedException>();
    }

    [Fact]
    public async Task Handle_DuplicateIp_ThrowsDuplicateVoteException()
    {
        // Arrange
        var poll = Poll.Create("What is best?", ["Option A", "Option B"], "dup-slug", "mgmt-token");
        var optionId = poll.Options.First().Id;

        _pollRepository.GetBySlugAsync("dup-slug", Arg.Any<CancellationToken>()).Returns(poll);
        _voteRepository.HasVotedAsync(poll.Id, "1.2.3.4", Arg.Any<CancellationToken>()).Returns(true);

        var command = new CastVoteCommand("dup-slug", optionId, "1.2.3.4");

        // Act
        var act = () => _handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<DuplicateVoteException>();
    }

    [Fact]
    public async Task Handle_DuplicateIp_DoesNotCallAddAsync()
    {
        // Arrange
        var poll = Poll.Create("What is best?", ["Option A", "Option B"], "dup-no-add", "mgmt-token");
        var optionId = poll.Options.First().Id;

        _pollRepository.GetBySlugAsync("dup-no-add", Arg.Any<CancellationToken>()).Returns(poll);
        _voteRepository.HasVotedAsync(poll.Id, "1.2.3.4", Arg.Any<CancellationToken>()).Returns(true);

        var command = new CastVoteCommand("dup-no-add", optionId, "1.2.3.4");

        // Act
        var act = () => _handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<DuplicateVoteException>();
        await _voteRepository.DidNotReceive().AddAsync(Arg.Any<Vote>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_InvalidOptionId_ThrowsDomainException()
    {
        // Arrange
        var poll = Poll.Create("What is best?", ["Option A", "Option B"], "invalid-opt", "mgmt-token");

        _pollRepository.GetBySlugAsync("invalid-opt", Arg.Any<CancellationToken>()).Returns(poll);
        _voteRepository.HasVotedAsync(Arg.Any<Guid>(), Arg.Any<string>(), Arg.Any<CancellationToken>()).Returns(false);

        var command = new CastVoteCommand("invalid-opt", Guid.NewGuid(), "1.2.3.4");

        // Act
        var act = () => _handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<DomainException>()
            .WithMessage("Invalid option for this poll.");
    }
}
