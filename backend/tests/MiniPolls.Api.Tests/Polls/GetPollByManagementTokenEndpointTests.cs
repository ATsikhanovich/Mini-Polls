using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace MiniPolls.Api.Tests.Polls;

public sealed class GetPollByManagementTokenEndpointTests : IClassFixture<MiniPollsWebApplicationFactory>
{
    private readonly HttpClient _client;

    public GetPollByManagementTokenEndpointTests(MiniPollsWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Get_ValidToken_Returns200WithPollAndResults()
    {
        // Arrange
        var createResponse = await _client.PostAsJsonAsync("/api/polls",
            new { question = "Best colour?", options = new[] { "Red", "Blue" } });
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var created = await createResponse.Content.ReadFromJsonAsync<CreatePollResponse>();

        // Act
        var response = await _client.GetAsync($"/api/polls/by-token/{created!.ManagementToken}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<ManagementPollResponse>();
        body.Should().NotBeNull();
        body!.Question.Should().Be("Best colour?");
        body.Slug.Should().Be(created.Slug);
        body.IsClosed.Should().BeFalse();
        body.TotalVotes.Should().Be(0);
        body.Options.Should().HaveCount(2);
    }

    [Fact]
    public async Task Get_ValidTokenWithVotes_ReturnsUpdatedResults()
    {
        // Arrange
        var createResponse = await _client.PostAsJsonAsync("/api/polls",
            new { question = "Best pet?", options = new[] { "Dog", "Cat" } });
        createResponse.EnsureSuccessStatusCode();

        var created = await createResponse.Content.ReadFromJsonAsync<CreatePollResponse>();

        var bySlugResponse = await _client.GetAsync($"/api/polls/by-slug/{created!.Slug}");
        bySlugResponse.EnsureSuccessStatusCode();
        var poll = await bySlugResponse.Content.ReadFromJsonAsync<PollDtoResponse>();
        var selectedOption = poll!.Options.First(o => o.Text == "Dog");

        await _client.PostAsJsonAsync($"/api/polls/{created.Slug}/votes", new { optionId = selectedOption.Id });

        // Act
        var response = await _client.GetAsync($"/api/polls/by-token/{created.ManagementToken}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<ManagementPollResponse>();
        body.Should().NotBeNull();
        body!.TotalVotes.Should().Be(1);

        var dog = body.Options.First(o => o.Text == "Dog");
        dog.VoteCount.Should().Be(1);
        dog.Percentage.Should().BeApproximately(100.0, 0.01);

        var cat = body.Options.First(o => o.Text == "Cat");
        cat.VoteCount.Should().Be(0);
    }

    [Fact]
    public async Task Get_InvalidToken_Returns404()
    {
        // Act
        var response = await _client.GetAsync("/api/polls/by-token/nonexistent-token");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var body = await response.Content.ReadFromJsonAsync<ProblemDetailsResponse>();
        body.Should().NotBeNull();
        body!.Status.Should().Be((int)HttpStatusCode.NotFound);
        body.Title.Should().Be("Poll not found");
        body.Detail.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task Get_ValidToken_AccessibleWithoutVoting()
    {
        // Arrange
        var createResponse = await _client.PostAsJsonAsync("/api/polls",
            new { question = "Accessible?", options = new[] { "Yes", "No" } });
        createResponse.EnsureSuccessStatusCode();

        var created = await createResponse.Content.ReadFromJsonAsync<CreatePollResponse>();

        // Act
        var response = await _client.GetAsync($"/api/polls/by-token/{created!.ManagementToken}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<ManagementPollResponse>();
        body.Should().NotBeNull();
        body!.Question.Should().Be("Accessible?");
        body.Options.Should().HaveCount(2);
    }

    private sealed record CreatePollResponse(Guid Id, string Slug, string ManagementToken);
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
    private sealed record ProblemDetailsResponse(int? Status, string? Title, string? Detail);
}
