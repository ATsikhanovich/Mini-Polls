using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MiniPolls.Infrastructure.Persistence;

namespace MiniPolls.Api.Tests.Polls;

public sealed class GetPollBySlugEndpointTests : IClassFixture<MiniPollsWebApplicationFactory>
{
    private readonly HttpClient _client;

    public GetPollBySlugEndpointTests(MiniPollsWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Get_ExistingSlug_Returns200WithPollDto()
    {
        // Arrange — create a poll
        var createRequest = new { question = "Best framework?", options = new[] { "React", "Vue", "Angular" } };
        var createResponse = await _client.PostAsJsonAsync("/api/polls", createRequest);
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var created = await createResponse.Content.ReadFromJsonAsync<CreatePollResponse>();
        created.Should().NotBeNull();

        // Act
        var response = await _client.GetAsync($"/api/polls/by-slug/{created!.Slug}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<PollDtoResponse>();
        body.Should().NotBeNull();
        body!.Question.Should().Be("Best framework?");
        body.Slug.Should().Be(created.Slug);
        body.Options.Should().HaveCount(3);
    }

    [Fact]
    public async Task Get_NonExistentSlug_Returns404()
    {
        // Act
        var response = await _client.GetAsync("/api/polls/by-slug/definitely-not-there");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    private sealed record CreatePollResponse(Guid Id, string Slug, string ManagementToken);
    private sealed record PollOptionDtoResponse(Guid Id, string Text, int SortOrder);
    private sealed record PollDtoResponse(Guid Id, string Question, string Slug, bool IsClosed, IReadOnlyList<PollOptionDtoResponse> Options);
}
