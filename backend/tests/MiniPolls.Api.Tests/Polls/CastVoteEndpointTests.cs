using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using MiniPolls.Infrastructure.Persistence;

namespace MiniPolls.Api.Tests.Polls;

public sealed class CastVoteEndpointTests : IClassFixture<MiniPollsWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly MiniPollsWebApplicationFactory _factory;

    public CastVoteEndpointTests(MiniPollsWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Post_ValidVote_Returns200WithVoteResult()
    {
        // Arrange
        var (slug, optionIds) = await CreatePollAndGetOptionsAsync("Vote test poll", ["Yes", "No"]);

        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/polls/{slug}/votes",
            new { optionId = optionIds[0] });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<CastVoteResultResponse>();
        body.Should().NotBeNull();
        body!.VoteId.Should().NotBeEmpty();
        body.PollOptionId.Should().Be(optionIds[0]);
    }

    [Fact]
    public async Task Post_DuplicateVote_Returns409()
    {
        // Arrange — first vote succeeds (loopback IP in tests)
        var (slug, optionIds) = await CreatePollAndGetOptionsAsync("Dup vote poll", ["A", "B"]);

        var firstVote = await _client.PostAsJsonAsync($"/api/polls/{slug}/votes", new { optionId = optionIds[0] });
        firstVote.StatusCode.Should().Be(HttpStatusCode.OK);

        // Act — second vote from same IP
        var response = await _client.PostAsJsonAsync($"/api/polls/{slug}/votes", new { optionId = optionIds[0] });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var body = await response.Content.ReadFromJsonAsync<DuplicateVoteResultResponse>();
        body.Should().NotBeNull();
        body!.Message.Should().NotBeNullOrWhiteSpace();
        body.Results.Should().NotBeNull();
        body.Results.Question.Should().Be("Dup vote poll");
        body.Results.TotalVotes.Should().BeGreaterThanOrEqualTo(1);
        body.Results.Options.Should().HaveCount(2);
    }

    [Fact]
    public async Task Post_ClosedPoll_Returns410()
    {
        // Arrange
        var (slug, optionIds) = await CreatePollAndGetOptionsAsync("Closed poll test", ["X", "Y"]);

        // Close poll directly in the database
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<MiniPollsDbContext>();
            var poll = await db.Polls.FindAsync([db.Polls.Where(p => p.Slug == slug).Select(p => p.Id).First()]);
            // Re-fetch with EF
            var pollEntity = db.Polls.Single(p => p.Slug == slug);
            pollEntity.Close();
            await db.SaveChangesAsync();
        }

        // Act
        var response = await _client.PostAsJsonAsync($"/api/polls/{slug}/votes", new { optionId = optionIds[0] });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Gone);
    }

    [Fact]
    public async Task Post_NonExistentSlug_Returns404()
    {
        // Act
        var response = await _client.PostAsJsonAsync(
            "/api/polls/no-such-poll/votes",
            new { optionId = Guid.NewGuid() });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Post_InvalidOptionId_Returns400()
    {
        // Arrange
        var (slug, _) = await CreatePollAndGetOptionsAsync("Invalid option poll", ["Opt1", "Opt2"]);

        // Act — use a random Guid that does not match any option
        var response = await _client.PostAsJsonAsync(
            $"/api/polls/{slug}/votes",
            new { optionId = Guid.NewGuid() });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    private async Task<(string Slug, List<Guid> OptionIds)> CreatePollAndGetOptionsAsync(
        string question,
        string[] options)
    {
        var createResponse = await _client.PostAsJsonAsync("/api/polls", new { question, options });
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<CreatePollResponse>();

        var slugResponse = await _client.GetAsync($"/api/polls/by-slug/{created!.Slug}");
        slugResponse.EnsureSuccessStatusCode();
        var pollDto = await slugResponse.Content.ReadFromJsonAsync<PollDtoResponse>();

        return (created.Slug, pollDto!.Options.Select(o => o.Id).ToList());
    }

    private sealed record CreatePollResponse(Guid Id, string Slug, string ManagementToken);
    private sealed record PollOptionDtoResponse(Guid Id, string Text, int SortOrder);
    private sealed record PollDtoResponse(Guid Id, string Question, string Slug, bool IsClosed, List<PollOptionDtoResponse> Options);
    private sealed record CastVoteResultResponse(Guid VoteId, Guid PollOptionId, DateTimeOffset CastAt);
    private sealed record DuplicateVoteResultResponse(string Message, ResultsResponse Results);
    private sealed record ResultsResponse(string Question, bool IsClosed, int TotalVotes, List<OptionResultResponse> Options);
    private sealed record OptionResultResponse(Guid Id, string Text, int VoteCount, double Percentage);
}
