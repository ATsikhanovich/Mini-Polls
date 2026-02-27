using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MiniPolls.Infrastructure.Persistence;

namespace MiniPolls.Api.Tests.Polls;

public sealed class CreatePollEndpointTests : IClassFixture<MiniPollsWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly MiniPollsWebApplicationFactory _factory;

    public CreatePollEndpointTests(MiniPollsWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Post_ValidPoll_Returns201WithSlugAndToken()
    {
        // Arrange
        var request = new
        {
            question = "Where should we eat tonight?",
            options = new[] { "Pizza", "Sushi", "Tacos" }
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/polls", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var body = await response.Content.ReadFromJsonAsync<CreatePollResponse>();
        body.Should().NotBeNull();
        body!.Slug.Should().NotBeNullOrWhiteSpace();
        body.ManagementToken.Should().NotBeNullOrWhiteSpace();
        body.Id.Should().NotBeEmpty();

        response.Headers.TryGetValues("Location", out var locationValues).Should().BeTrue();
        locationValues!.Single().Should().Contain(body.Slug);
    }

    [Fact]
    public async Task Post_EmptyQuestion_Returns400WithValidationErrors()
    {
        // Arrange
        var request = new
        {
            question = "",
            options = new[] { "Option A", "Option B" }
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/polls", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Question");
    }

    [Fact]
    public async Task Post_SingleOption_Returns400WithValidationErrors()
    {
        // Arrange
        var request = new
        {
            question = "Valid question?",
            options = new[] { "Only one option" }
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/polls", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Options");
    }

    [Fact]
    public async Task Post_ValidPoll_PersistsToDatabase()
    {
        // Arrange
        var request = new
        {
            question = "Persistence test question?",
            options = new[] { "Alpha", "Beta" }
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/polls", request);
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var body = await response.Content.ReadFromJsonAsync<CreatePollResponse>();
        body.Should().NotBeNull();

        // Assert — verify the poll was written to the database
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<MiniPollsDbContext>();

        var poll = db.Polls
            .Include(p => p.Options)
            .SingleOrDefault(p => p.Slug == body!.Slug);
        poll.Should().NotBeNull();
        poll!.Question.Should().Be("Persistence test question?");
        poll.Options.Should().HaveCount(2);
    }

    // Minimal response shape for deserialization in tests
    private sealed record CreatePollResponse(
        Guid Id,
        string Slug,
        string ManagementToken,
        DateTimeOffset CreatedAt,
        DateTimeOffset? ExpiresAt);
}
