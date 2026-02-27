using FluentAssertions;
using MiniPolls.Application.Interfaces;
using MiniPolls.Application.Votes.CheckVote;
using MiniPolls.Domain.Entities;
using MiniPolls.Domain.Exceptions;
using NSubstitute;

namespace MiniPolls.Application.Tests.Votes.CheckVote;

public sealed class CheckVoteQueryHandlerTests
{
    private readonly IPollRepository _pollRepository = Substitute.For<IPollRepository>();
    private readonly IVoteRepository _voteRepository = Substitute.For<IVoteRepository>();
    private readonly CheckVoteQueryHandler _handler;

    public CheckVoteQueryHandlerTests()
    {
        _handler = new CheckVoteQueryHandler(_pollRepository, _voteRepository);
    }

    [Fact]
    public async Task Handle_HasVoted_ReturnsTrue()
    {
        // Arrange
        var poll = Poll.Create("Voted?", ["Yes", "No"], "voted-slug", "mgmt-token");

        _pollRepository.GetBySlugAsync("voted-slug", Arg.Any<CancellationToken>()).Returns(poll);
        _voteRepository.HasVotedAsync(poll.Id, "1.2.3.4", Arg.Any<CancellationToken>()).Returns(true);

        // Act
        var result = await _handler.Handle(new CheckVoteQuery("voted-slug", "1.2.3.4"), CancellationToken.None);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task Handle_HasNotVoted_ReturnsFalse()
    {
        // Arrange
        var poll = Poll.Create("Not voted?", ["Yes", "No"], "notvoted-slug", "mgmt-token");

        _pollRepository.GetBySlugAsync("notvoted-slug", Arg.Any<CancellationToken>()).Returns(poll);
        _voteRepository.HasVotedAsync(poll.Id, "5.6.7.8", Arg.Any<CancellationToken>()).Returns(false);

        // Act
        var result = await _handler.Handle(new CheckVoteQuery("notvoted-slug", "5.6.7.8"), CancellationToken.None);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task Handle_PollNotFound_ThrowsPollNotFoundException()
    {
        // Arrange
        _pollRepository.GetBySlugAsync("ghost", Arg.Any<CancellationToken>()).Returns((Poll?)null);

        // Act
        var act = () => _handler.Handle(new CheckVoteQuery("ghost", "1.2.3.4"), CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<PollNotFoundException>();
    }
}
