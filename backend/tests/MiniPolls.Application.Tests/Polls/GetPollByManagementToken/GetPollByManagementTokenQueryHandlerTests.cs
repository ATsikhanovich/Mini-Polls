using FluentAssertions;
using MiniPolls.Application.Interfaces;
using MiniPolls.Application.Polls.GetPollByManagementToken;
using MiniPolls.Domain.Entities;
using MiniPolls.Domain.Exceptions;
using NSubstitute;

namespace MiniPolls.Application.Tests.Polls.GetPollByManagementToken;

public sealed class GetPollByManagementTokenQueryHandlerTests
{
    private readonly IPollRepository _pollRepository = Substitute.For<IPollRepository>();
    private readonly GetPollByManagementTokenQueryHandler _handler;

    public GetPollByManagementTokenQueryHandlerTests()
    {
        _handler = new GetPollByManagementTokenQueryHandler(_pollRepository);
    }

    [Fact]
    public async Task Handle_ValidToken_ReturnsManagementPollDtoWithMetadataAndResults()
    {
        // Arrange
        var poll = Poll.Create("Best colour?", ["Red", "Blue", "Green"], "col12", "mgmt-token");
        var options = poll.Options.OrderBy(o => o.SortOrder).ToList();
        AddVotes(options[0], 2);
        AddVotes(options[1], 1);

        _pollRepository.GetByManagementTokenAsync("mgmt-token", Arg.Any<CancellationToken>()).Returns(poll);

        // Act
        var result = await _handler.Handle(new GetPollByManagementTokenQuery("mgmt-token"), CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(poll.Id);
        result.Question.Should().Be(poll.Question);
        result.Slug.Should().Be(poll.Slug);
        result.IsClosed.Should().Be(poll.IsClosed);
        result.ExpiresAt.Should().Be(poll.ExpiresAt);
        result.ClosedAt.Should().Be(poll.ClosedAt);
        result.CreatedAt.Should().Be(poll.CreatedAt);
        result.TotalVotes.Should().Be(3);
        result.Options.Select(o => o.SortOrder).Should().BeInAscendingOrder();

        var red = result.Options.First(o => o.Text == "Red");
        red.VoteCount.Should().Be(2);
        red.Percentage.Should().BeApproximately(66.67, 0.1);

        var blue = result.Options.First(o => o.Text == "Blue");
        blue.VoteCount.Should().Be(1);
        blue.Percentage.Should().BeApproximately(33.33, 0.1);

        var green = result.Options.First(o => o.Text == "Green");
        green.VoteCount.Should().Be(0);
        green.Percentage.Should().Be(0);
    }

    [Fact]
    public async Task Handle_ValidToken_PollWithNoVotes_ReturnsZeroCounts()
    {
        // Arrange
        var poll = Poll.Create("Any votes?", ["Yes", "No"], "zero12", "mgmt-zero");

        _pollRepository.GetByManagementTokenAsync("mgmt-zero", Arg.Any<CancellationToken>()).Returns(poll);

        // Act
        var result = await _handler.Handle(new GetPollByManagementTokenQuery("mgmt-zero"), CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result!.TotalVotes.Should().Be(0);
        result.Options.Should().AllSatisfy(option =>
        {
            option.VoteCount.Should().Be(0);
            option.Percentage.Should().Be(0);
        });
    }

    [Fact]
    public async Task Handle_InvalidToken_ThrowsPollNotFoundException()
    {
        // Arrange
        _pollRepository.GetByManagementTokenAsync("missing", Arg.Any<CancellationToken>()).Returns((Poll?)null);
        var act = () => _handler.Handle(new GetPollByManagementTokenQuery("missing"), CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<PollNotFoundException>();
    }

    [Fact]
    public async Task Handle_ClosedPoll_ReturnsIsClosedTrue()
    {
        // Arrange
        var poll = Poll.Create("Closed?", ["A", "B"], "close12", "mgmt-close");
        poll.Close();

        _pollRepository.GetByManagementTokenAsync("mgmt-close", Arg.Any<CancellationToken>()).Returns(poll);

        // Act
        var result = await _handler.Handle(new GetPollByManagementTokenQuery("mgmt-close"), CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result!.IsClosed.Should().BeTrue();
        result.ClosedAt.Should().NotBeNull();
    }

    private static void AddVotes(PollOption option, int count)
    {
        var votesField = typeof(PollOption)
            .GetField("_votes", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!;
        var votes = (List<Vote>)votesField.GetValue(option)!;

        for (var i = 0; i < count; i++)
            votes.Add(Vote.Create(option.Id, $"1.2.3.{i + 1}"));
    }
}
