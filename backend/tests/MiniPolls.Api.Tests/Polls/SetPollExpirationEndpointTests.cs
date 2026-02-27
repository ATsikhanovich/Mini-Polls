using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace MiniPolls.Api.Tests.Polls;

public sealed class SetPollExpirationEndpointTests : IClassFixture<MiniPollsWebApplicationFactory>
{
    private readonly HttpClient _client;

    public SetPollExpirationEndpointTests(MiniPollsWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Put_ValidToken_FutureDate_Returns200AndSetsExpiration()
    {
        var createResponse = await _client.PostAsJsonAsync("/api/polls",
            new { question = "Set expiry?", options = new[] { "A", "B" } });
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var created = await createResponse.Content.ReadFromJsonAsync<CreatePollResponse>();
        var future = DateTimeOffset.UtcNow.AddHours(2);

        var response = await _client.PutAsJsonAsync(
            $"/api/polls/{created!.ManagementToken}/expiration",
            new { expiresAt = future });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<SetPollExpirationResponse>();
        body.Should().NotBeNull();
        body!.ExpiresAt.Should().NotBeNull();
        body.ExpiresAt.Should().BeCloseTo(future, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task Put_ValidToken_UpdatesExistingExpiration_Returns200()
    {
        var firstExpiration = DateTimeOffset.UtcNow.AddHours(1);
        var createResponse = await _client.PostAsJsonAsync("/api/polls",
            new
            {
                question = "Update expiry?",
                options = new[] { "A", "B" },
                expiresAt = firstExpiration
            });
        createResponse.EnsureSuccessStatusCode();

        var created = await createResponse.Content.ReadFromJsonAsync<CreatePollResponse>();
        var updatedExpiration = DateTimeOffset.UtcNow.AddHours(5);

        var response = await _client.PutAsJsonAsync(
            $"/api/polls/{created!.ManagementToken}/expiration",
            new { expiresAt = updatedExpiration });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<SetPollExpirationResponse>();
        body.Should().NotBeNull();
        body!.ExpiresAt.Should().NotBeNull();
        body.ExpiresAt.Should().BeCloseTo(updatedExpiration, TimeSpan.FromSeconds(1));
        body.ExpiresAt.Should().NotBeCloseTo(firstExpiration, TimeSpan.FromSeconds(1));

        var managementResponse = await _client.GetAsync($"/api/polls/by-token/{created.ManagementToken}");
        managementResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var management = await managementResponse.Content.ReadFromJsonAsync<ManagementPollResponse>();
        management.Should().NotBeNull();
        management!.ExpiresAt.Should().NotBeNull();
        management.ExpiresAt.Should().BeCloseTo(updatedExpiration, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task Put_InvalidToken_Returns404()
    {
        var response = await _client.PutAsJsonAsync(
            "/api/polls/nonexistent-token/expiration",
            new { expiresAt = DateTimeOffset.UtcNow.AddHours(1) });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var body = await response.Content.ReadFromJsonAsync<ProblemDetailsResponse>();
        body.Should().NotBeNull();
        body!.Status.Should().Be((int)HttpStatusCode.NotFound);
        body.Title.Should().Be("Poll not found");
        body.Detail.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task Put_PastDate_Returns400()
    {
        var createResponse = await _client.PostAsJsonAsync("/api/polls",
            new { question = "Past date?", options = new[] { "A", "B" } });
        createResponse.EnsureSuccessStatusCode();

        var created = await createResponse.Content.ReadFromJsonAsync<CreatePollResponse>();

        var response = await _client.PutAsJsonAsync(
            $"/api/polls/{created!.ManagementToken}/expiration",
            new { expiresAt = DateTimeOffset.UtcNow.AddMinutes(-1) });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Put_ClosedPoll_Returns400()
    {
        var createResponse = await _client.PostAsJsonAsync("/api/polls",
            new { question = "Closed poll?", options = new[] { "A", "B" } });
        createResponse.EnsureSuccessStatusCode();

        var created = await createResponse.Content.ReadFromJsonAsync<CreatePollResponse>();
        await _client.PostAsync($"/api/polls/{created!.ManagementToken}/close", null);

        var response = await _client.PutAsJsonAsync(
            $"/api/polls/{created.ManagementToken}/expiration",
            new { expiresAt = DateTimeOffset.UtcNow.AddHours(1) });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().ContainEquivalentOf("closed");
    }

    [Fact]
    public async Task Put_ManagementPageReflectsNewExpiration()
    {
        var createResponse = await _client.PostAsJsonAsync("/api/polls",
            new { question = "Manage expiry", options = new[] { "A", "B" } });
        createResponse.EnsureSuccessStatusCode();

        var created = await createResponse.Content.ReadFromJsonAsync<CreatePollResponse>();
        var future = DateTimeOffset.UtcNow.AddHours(4);

        var setResponse = await _client.PutAsJsonAsync(
            $"/api/polls/{created!.ManagementToken}/expiration",
            new { expiresAt = future });
        setResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var response = await _client.GetAsync($"/api/polls/by-token/{created.ManagementToken}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var management = await response.Content.ReadFromJsonAsync<ManagementPollResponse>();
        management.Should().NotBeNull();
        management!.ExpiresAt.Should().NotBeNull();
        management.ExpiresAt.Should().BeCloseTo(future, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task Put_PublicPollPageReflectsExpiration()
    {
        var createResponse = await _client.PostAsJsonAsync("/api/polls",
            new { question = "Public expiry", options = new[] { "A", "B" } });
        createResponse.EnsureSuccessStatusCode();

        var created = await createResponse.Content.ReadFromJsonAsync<CreatePollResponse>();
        var future = DateTimeOffset.UtcNow.AddHours(4);

        var setResponse = await _client.PutAsJsonAsync(
            $"/api/polls/{created!.ManagementToken}/expiration",
            new { expiresAt = future });
        setResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var response = await _client.GetAsync($"/api/polls/by-slug/{created.Slug}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var poll = await response.Content.ReadFromJsonAsync<PollDtoResponse>();
        poll.Should().NotBeNull();
        poll!.ExpiresAt.Should().NotBeNull();
        poll.ExpiresAt.Should().BeCloseTo(future, TimeSpan.FromSeconds(1));
    }

    private sealed record CreatePollResponse(
        Guid Id,
        string Slug,
        string ManagementToken,
        DateTimeOffset CreatedAt,
        DateTimeOffset? ExpiresAt);

    private sealed record SetPollExpirationResponse(Guid Id, DateTimeOffset? ExpiresAt);

    private sealed record ManagementOptionResponse(
        Guid Id,
        string Text,
        int SortOrder,
        int VoteCount,
        double Percentage);

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

    private sealed record PollOptionDtoResponse(Guid Id, string Text, int SortOrder);

    private sealed record PollDtoResponse(
        Guid Id,
        string Question,
        string Slug,
        bool IsClosed,
        DateTimeOffset? ExpiresAt,
        DateTimeOffset CreatedAt,
        IReadOnlyList<PollOptionDtoResponse> Options);

    private sealed record ProblemDetailsResponse(int? Status, string? Title, string? Detail);
}
