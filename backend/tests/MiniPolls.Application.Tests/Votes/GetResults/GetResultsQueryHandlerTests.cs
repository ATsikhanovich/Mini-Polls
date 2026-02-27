using FluentAssertions;
using MiniPolls.Application.Interfaces;
using MiniPolls.Application.Votes.GetResults;
using MiniPolls.Domain.Entities;
using MiniPolls.Domain.Exceptions;
using NSubstitute;

namespace MiniPolls.Application.Tests.Votes.GetResults;

public sealed class GetResultsQueryHandlerTests
{
    private readonly IPollRepository _pollRepository = Substitute.For<IPollRepository>();
    private readonly GetResultsQueryHandler _handler;

    public GetResultsQueryHandlerTests()
    {
        _handler = new GetResultsQueryHandler(_pollRepository);
    }

    [Fact]
    public async Task Handle_PollWithVotes_ReturnsCorrectCountsAndPercentages()
    {
        // Arrange
        var poll = Poll.Create("Best language?", ["C#", "Python", "Go"], "results-slug", "mgmt-token");

        // Simulate votes by accessing private _votes via reflection (or by checking Vote.Create)
        // We'll add votes directly to options using reflection since PollOption._votes is private
        var options = poll.Options.OrderBy(o => o.SortOrder).ToList();
        AddVotes(options[0], 2); // 2 votes for C#
        AddVotes(options[1], 1); // 1 vote for Python
        // 0 votes for Go

        _pollRepository.GetBySlugAsync("results-slug", Arg.Any<CancellationToken>()).Returns(poll);

        // Act
        var result = await _handler.Handle(new GetResultsQuery("results-slug"), CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result!.TotalVotes.Should().Be(3);
        result.Question.Should().Be("Best language?");

        var csharp = result.Options.First(o => o.Text == "C#");
        csharp.VoteCount.Should().Be(2);
        csharp.Percentage.Should().BeApproximately(66.67, 0.1);

        var python = result.Options.First(o => o.Text == "Python");
        python.VoteCount.Should().Be(1);
        python.Percentage.Should().BeApproximately(33.33, 0.1);

        var go = result.Options.First(o => o.Text == "Go");
        go.VoteCount.Should().Be(0);
        go.Percentage.Should().Be(0);
    }

    [Fact]
    public async Task Handle_PollWithNoVotes_ReturnsZeroPercentages()
    {
        // Arrange
        var poll = Poll.Create("Any votes?", ["Yes", "No"], "no-votes-slug", "mgmt-token");

        _pollRepository.GetBySlugAsync("no-votes-slug", Arg.Any<CancellationToken>()).Returns(poll);

        // Act
        var result = await _handler.Handle(new GetResultsQuery("no-votes-slug"), CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result!.TotalVotes.Should().Be(0);
        result.Options.Should().AllSatisfy(o =>
        {
            o.VoteCount.Should().Be(0);
            o.Percentage.Should().Be(0);
        });
    }

    [Fact]
    public async Task Handle_NonExistentSlug_ThrowsPollNotFoundException()
    {
        // Arrange
        _pollRepository.GetBySlugAsync("nope", Arg.Any<CancellationToken>()).Returns((Poll?)null);
        var act = () => _handler.Handle(new GetResultsQuery("nope"), CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<PollNotFoundException>();
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
