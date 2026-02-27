using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace MiniPolls.Api.Tests.Polls;

public sealed class ClosePollEndpointTests : IClassFixture<MiniPollsWebApplicationFactory>
{
    private readonly HttpClient _client;

    public ClosePollEndpointTests(MiniPollsWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Post_ValidToken_Returns200AndPollIsClosed()
    {
        // Arrange
        var createResponse = await _client.PostAsJsonAsync("/api/polls",
            new { question = "Close me?", options = new[] { "Yes", "No" } });
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var created = await createResponse.Content.ReadFromJsonAsync<CreatePollResponse>();

        // Act
        var response = await _client.PostAsync($"/api/polls/{created!.ManagementToken}/close", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<ClosePollResponse>();
        body.Should().NotBeNull();
        body!.IsClosed.Should().BeTrue();
        body.ClosedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task Post_ValidToken_AlreadyClosed_Returns200Idempotent()
    {
        // Arrange
        var createResponse = await _client.PostAsJsonAsync("/api/polls",
            new { question = "Double close?", options = new[] { "A", "B" } });
        createResponse.EnsureSuccessStatusCode();

        var created = await createResponse.Content.ReadFromJsonAsync<CreatePollResponse>();
        await _client.PostAsync($"/api/polls/{created!.ManagementToken}/close", null);

        // Act
        var response = await _client.PostAsync($"/api/polls/{created.ManagementToken}/close", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<ClosePollResponse>();
        body.Should().NotBeNull();
        body!.IsClosed.Should().BeTrue();
    }

    [Fact]
    public async Task Post_InvalidToken_Returns404()
    {
        // Act
        var response = await _client.PostAsync("/api/polls/nonexistent-token/close", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var body = await response.Content.ReadFromJsonAsync<ProblemDetailsResponse>();
        body.Should().NotBeNull();
        body!.Status.Should().Be((int)HttpStatusCode.NotFound);
        body.Title.Should().Be("Poll not found");
        body.Detail.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task Post_ClosedPoll_VotingReturns410()
    {
        // Arrange
        var createResponse = await _client.PostAsJsonAsync("/api/polls",
            new { question = "Vote then close?", options = new[] { "A", "B" } });
        createResponse.EnsureSuccessStatusCode();

        var created = await createResponse.Content.ReadFromJsonAsync<CreatePollResponse>();

        var bySlugResponse = await _client.GetAsync($"/api/polls/by-slug/{created!.Slug}");
        bySlugResponse.EnsureSuccessStatusCode();
        var poll = await bySlugResponse.Content.ReadFromJsonAsync<PollDtoResponse>();

        await _client.PostAsync($"/api/polls/{created.ManagementToken}/close", null);

        // Act
        var voteResponse = await _client.PostAsJsonAsync(
            $"/api/polls/{created.Slug}/votes",
            new { optionId = poll!.Options[0].Id });

        // Assert
        voteResponse.StatusCode.Should().Be(HttpStatusCode.Gone);
    }

    [Fact]
    public async Task Post_ClosedPoll_ManagementPageShowsClosed()
    {
        // Arrange
        var createResponse = await _client.PostAsJsonAsync("/api/polls",
            new { question = "Manage status?", options = new[] { "Yes", "No" } });
        createResponse.EnsureSuccessStatusCode();

        var created = await createResponse.Content.ReadFromJsonAsync<CreatePollResponse>();
        await _client.PostAsync($"/api/polls/{created!.ManagementToken}/close", null);

        // Act
        var response = await _client.GetAsync($"/api/polls/by-token/{created.ManagementToken}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<ManagementPollResponse>();
        body.Should().NotBeNull();
        body!.IsClosed.Should().BeTrue();
        body.ClosedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task Post_ClosedPoll_VoterSeesResultsWithClosedStatus()
    {
        // Arrange
        var createResponse = await _client.PostAsJsonAsync("/api/polls",
            new { question = "Final results?", options = new[] { "Option A", "Option B" } });
        createResponse.EnsureSuccessStatusCode();

        var created = await createResponse.Content.ReadFromJsonAsync<CreatePollResponse>();

        var bySlugResponse = await _client.GetAsync($"/api/polls/by-slug/{created!.Slug}");
        bySlugResponse.EnsureSuccessStatusCode();
        var poll = await bySlugResponse.Content.ReadFromJsonAsync<PollDtoResponse>();

        var voteResponse = await _client.PostAsJsonAsync(
            $"/api/polls/{created.Slug}/votes",
            new { optionId = poll!.Options[0].Id });
        voteResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        await _client.PostAsync($"/api/polls/{created.ManagementToken}/close", null);

        // Act
        var resultsResponse = await _client.GetAsync($"/api/polls/{created.Slug}/results");

        // Assert
        resultsResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var results = await resultsResponse.Content.ReadFromJsonAsync<ResultsResponse>();
        results.Should().NotBeNull();
        results!.IsClosed.Should().BeTrue();
    }

    private sealed record CreatePollResponse(Guid Id, string Slug, string ManagementToken);
    private sealed record ClosePollResponse(Guid Id, bool IsClosed, DateTimeOffset? ClosedAt);
    private sealed record PollOptionDtoResponse(Guid Id, string Text, int SortOrder);
    private sealed record PollDtoResponse(Guid Id, string Question, string Slug, bool IsClosed, IReadOnlyList<PollOptionDtoResponse> Options);
    private sealed record ManagementOptionResponse(Guid Id, string Text, int SortOrder, int VoteCount, double Percentage);
    private sealed record ManagementPollResponse(
        Guid Id,
        string Question,
        string Slug,
        bool IsClosed,
        DateTimeOffset? ExpiresAt,
        DateTimeOffset? ClosedAt,
        DateTimeOffset CreatedAt,
        int TotalVotes,
        IReadOnlyList<ManagementOptionResponse> Options);
    private sealed record ResultsResponse(Guid PollId, string Question, bool IsClosed, int TotalVotes, IReadOnlyList<ResultsOptionResponse> Options);
    private sealed record ResultsOptionResponse(Guid Id, string Text, int VoteCount, double Percentage);
    private sealed record ProblemDetailsResponse(int? Status, string? Title, string? Detail);
}