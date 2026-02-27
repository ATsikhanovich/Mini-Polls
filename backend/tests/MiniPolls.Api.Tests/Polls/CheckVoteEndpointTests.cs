using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace MiniPolls.Api.Tests.Polls;

public sealed class CheckVoteEndpointTests : IClassFixture<MiniPollsWebApplicationFactory>
{
    private readonly HttpClient _client;

    public CheckVoteEndpointTests(MiniPollsWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Get_HasNotVoted_Returns200WithFalse()
    {
        // Arrange
        var createResponse = await _client.PostAsJsonAsync("/api/polls",
            new { question = "Check no vote?", options = new[] { "Yes", "No" } });
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<CreatePollResponse>();

        // Act — check vote before voting
        var response = await _client.GetAsync($"/api/polls/{created!.Slug}/vote-check");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<VoteCheckResponse>();
        body.Should().NotBeNull();
        body!.HasVoted.Should().BeFalse();
    }

    [Fact]
    public async Task Get_HasVoted_Returns200WithTrue()
    {
        // Arrange — create poll and vote
        var createResponse = await _client.PostAsJsonAsync("/api/polls",
            new { question = "Check with vote?", options = new[] { "A", "B" } });
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<CreatePollResponse>();

        var slugResponse = await _client.GetAsync($"/api/polls/by-slug/{created!.Slug}");
        var pollDto = await slugResponse.Content.ReadFromJsonAsync<PollDtoResponse>();
        var firstOptionId = pollDto!.Options.First().Id;

        var voteResponse = await _client.PostAsJsonAsync(
            $"/api/polls/{created.Slug}/votes",
            new { optionId = firstOptionId });
        voteResponse.EnsureSuccessStatusCode();

        // Act — check vote after voting
        var response = await _client.GetAsync($"/api/polls/{created.Slug}/vote-check");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<VoteCheckResponse>();
        body.Should().NotBeNull();
        body!.HasVoted.Should().BeTrue();
    }

    [Fact]
    public async Task Get_NonExistentSlug_Returns404()
    {
        // Act
        var response = await _client.GetAsync("/api/polls/definitely-not-there/vote-check");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var body = await response.Content.ReadFromJsonAsync<ProblemDetailsResponse>();
        body.Should().NotBeNull();
        body!.Status.Should().Be((int)HttpStatusCode.NotFound);
        body.Title.Should().ContainEquivalentOf("not found");
    }

    private sealed record CreatePollResponse(Guid Id, string Slug, string ManagementToken);
    private sealed record PollOptionDtoResponse(Guid Id, string Text, int SortOrder);
    private sealed record PollDtoResponse(Guid Id, string Question, string Slug, bool IsClosed, List<PollOptionDtoResponse> Options);
    private sealed record VoteCheckResponse(bool HasVoted);
    private sealed record ProblemDetailsResponse(int? Status, string? Title, string? Detail);
}
