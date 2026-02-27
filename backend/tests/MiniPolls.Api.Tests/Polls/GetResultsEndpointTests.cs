using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace MiniPolls.Api.Tests.Polls;

public sealed class GetResultsEndpointTests : IClassFixture<MiniPollsWebApplicationFactory>
{
    private readonly HttpClient _client;

    public GetResultsEndpointTests(MiniPollsWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Get_PollWithVotes_Returns200WithResults()
    {
        // Arrange — create poll and cast a vote
        var createResponse = await _client.PostAsJsonAsync("/api/polls",
            new { question = "Results with votes?", options = new[] { "Alpha", "Beta" } });
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<CreatePollResponse>();

        var slugResponse = await _client.GetAsync($"/api/polls/by-slug/{created!.Slug}");
        var pollDto = await slugResponse.Content.ReadFromJsonAsync<PollDtoResponse>();
        var firstOptionId = pollDto!.Options.First().Id;

        await _client.PostAsJsonAsync($"/api/polls/{created.Slug}/votes", new { optionId = firstOptionId });

        // Act
        var response = await _client.GetAsync($"/api/polls/{created.Slug}/results");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<PollResultsResponse>();
        body.Should().NotBeNull();
        body!.TotalVotes.Should().Be(1);
        body.Options.Should().HaveCount(2);

        var alpha = body.Options.First(o => o.Text == "Alpha");
        alpha.VoteCount.Should().Be(1);
        alpha.Percentage.Should().BeApproximately(100.0, 0.01);

        var beta = body.Options.First(o => o.Text == "Beta");
        beta.VoteCount.Should().Be(0);
        beta.Percentage.Should().Be(0);
    }

    [Fact]
    public async Task Get_PollWithNoVotes_Returns200WithZeroCounts()
    {
        // Arrange
        var createResponse = await _client.PostAsJsonAsync("/api/polls",
            new { question = "Zero votes poll?", options = new[] { "Yes", "No" } });
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<CreatePollResponse>();

        // Act
        var response = await _client.GetAsync($"/api/polls/{created!.Slug}/results");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<PollResultsResponse>();
        body.Should().NotBeNull();
        body!.TotalVotes.Should().Be(0);
        body.Options.Should().AllSatisfy(o =>
        {
            o.VoteCount.Should().Be(0);
            o.Percentage.Should().Be(0);
        });
    }

    [Fact]
    public async Task Get_NonExistentSlug_Returns404()
    {
        // Act
        var response = await _client.GetAsync("/api/polls/no-results-here/results");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    private sealed record CreatePollResponse(Guid Id, string Slug, string ManagementToken);
    private sealed record PollOptionDtoResponse(Guid Id, string Text, int SortOrder);
    private sealed record PollDtoResponse(Guid Id, string Question, string Slug, bool IsClosed, List<PollOptionDtoResponse> Options);
    private sealed record OptionResultResponse(Guid Id, string Text, int VoteCount, double Percentage);
    private sealed record PollResultsResponse(string Question, bool IsClosed, int TotalVotes, List<OptionResultResponse> Options);
}
