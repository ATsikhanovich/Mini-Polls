using FluentAssertions;
using MiniPolls.Application.Interfaces;
using MiniPolls.Application.Polls.GetPollBySlug;
using MiniPolls.Domain.Entities;
using NSubstitute;

namespace MiniPolls.Application.Tests.Polls.GetPollBySlug;

public sealed class GetPollBySlugQueryHandlerTests
{
    private readonly IPollRepository _pollRepository = Substitute.For<IPollRepository>();
    private readonly GetPollBySlugQueryHandler _handler;

    public GetPollBySlugQueryHandlerTests()
    {
        _handler = new GetPollBySlugQueryHandler(_pollRepository);
    }

    [Fact]
    public async Task Handle_ExistingSlug_ReturnsPollDto()
    {
        // Arrange
        var poll = Poll.Create(
            "What is your favourite?",
            ["Option A", "Option B", "Option C"],
            "test-slug",
            "mgmt-token-xxx");

        _pollRepository.GetBySlugAsync("test-slug", Arg.Any<CancellationToken>()).Returns(poll);

        // Act
        var result = await _handler.Handle(new GetPollBySlugQuery("test-slug"), CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result!.Slug.Should().Be("test-slug");
        result.Question.Should().Be("What is your favourite?");
        result.Options.Should().HaveCount(3);
        result.Options.Select(o => o.SortOrder).Should().BeInAscendingOrder();
        result.IsClosed.Should().BeFalse();
    }

    [Fact]
    public async Task Handle_NonExistentSlug_ReturnsNull()
    {
        // Arrange
        _pollRepository.GetBySlugAsync("missing", Arg.Any<CancellationToken>()).Returns((Poll?)null);

        // Act
        var result = await _handler.Handle(new GetPollBySlugQuery("missing"), CancellationToken.None);

        // Assert
        result.Should().BeNull();
    }
}
