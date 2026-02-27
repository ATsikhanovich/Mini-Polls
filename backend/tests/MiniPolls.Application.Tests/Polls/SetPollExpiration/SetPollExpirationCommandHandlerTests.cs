using FluentAssertions;
using MiniPolls.Application.Interfaces;
using MiniPolls.Application.Polls.SetPollExpiration;
using MiniPolls.Domain.Entities;
using MiniPolls.Domain.Exceptions;
using NSubstitute;

namespace MiniPolls.Application.Tests.Polls.SetPollExpiration;

public sealed class SetPollExpirationCommandHandlerTests
{
    private readonly IPollRepository _pollRepository = Substitute.For<IPollRepository>();
    private readonly SetPollExpirationCommandHandler _handler;

    public SetPollExpirationCommandHandlerTests()
    {
        _handler = new SetPollExpirationCommandHandler(_pollRepository);
    }

    [Fact]
    public async Task Handle_ValidToken_ActivePoll_SetsExpirationAndReturnsResult()
    {
        var poll = Poll.Create("Best colour?", ["Red", "Blue"], "col12", "mgmt-token");
        var expiresAt = DateTimeOffset.UtcNow.AddHours(2);

        _pollRepository.GetByManagementTokenAsync("mgmt-token", Arg.Any<CancellationToken>())
            .Returns(poll);

        var result = await _handler.Handle(
            new SetPollExpirationCommand("mgmt-token", expiresAt),
            CancellationToken.None);

        result.Should().NotBeNull();
        result.Id.Should().Be(poll.Id);
        result.ExpiresAt.Should().NotBeNull();
        result.ExpiresAt.Should().BeCloseTo(expiresAt, TimeSpan.FromSeconds(1));

        await _pollRepository.Received(1).UpdateAsync(poll, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ValidToken_ActivePoll_UpdatesExistingExpiration()
    {
        var initialExpiration = DateTimeOffset.UtcNow.AddHours(1);
        var updatedExpiration = DateTimeOffset.UtcNow.AddHours(3);
        var poll = Poll.Create("Best colour?", ["Red", "Blue"], "col12", "mgmt-token", initialExpiration);

        _pollRepository.GetByManagementTokenAsync("mgmt-token", Arg.Any<CancellationToken>())
            .Returns(poll);

        var result = await _handler.Handle(
            new SetPollExpirationCommand("mgmt-token", updatedExpiration),
            CancellationToken.None);

        result.ExpiresAt.Should().NotBeNull();
        result.ExpiresAt.Should().BeCloseTo(updatedExpiration, TimeSpan.FromSeconds(1));
        result.ExpiresAt.Should().NotBeCloseTo(initialExpiration, TimeSpan.FromSeconds(1));

        await _pollRepository.Received(1).UpdateAsync(poll, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_InvalidToken_ThrowsPollNotFoundException()
    {
        _pollRepository.GetByManagementTokenAsync("missing", Arg.Any<CancellationToken>())
            .Returns((Poll?)null);

        var act = () => _handler.Handle(
            new SetPollExpirationCommand("missing", DateTimeOffset.UtcNow.AddHours(1)),
            CancellationToken.None);

        await act.Should().ThrowAsync<PollNotFoundException>();
    }

    [Fact]
    public async Task Handle_ClosedPoll_ThrowsDomainException()
    {
        var poll = Poll.Create("Best colour?", ["Red", "Blue"], "col12", "mgmt-token");
        poll.Close();

        _pollRepository.GetByManagementTokenAsync("mgmt-token", Arg.Any<CancellationToken>())
            .Returns(poll);

        var act = () => _handler.Handle(
            new SetPollExpirationCommand("mgmt-token", DateTimeOffset.UtcNow.AddHours(1)),
            CancellationToken.None);

        await act.Should()
            .ThrowAsync<DomainException>()
            .WithMessage("*closed*");
    }

    [Fact]
    public async Task Handle_PastDate_ThrowsDomainException()
    {
        var poll = Poll.Create("Best colour?", ["Red", "Blue"], "col12", "mgmt-token");

        _pollRepository.GetByManagementTokenAsync("mgmt-token", Arg.Any<CancellationToken>())
            .Returns(poll);

        var act = () => _handler.Handle(
            new SetPollExpirationCommand("mgmt-token", DateTimeOffset.UtcNow.AddMinutes(-1)),
            CancellationToken.None);

        await act.Should()
            .ThrowAsync<DomainException>()
            .WithMessage("*future*");
    }

    [Fact]
    public async Task Handle_ValidToken_CallsUpdateAsyncExactlyOnce()
    {
        var poll = Poll.Create("Best colour?", ["Red", "Blue"], "col12", "mgmt-token");
        var expiresAt = DateTimeOffset.UtcNow.AddHours(2);

        _pollRepository.GetByManagementTokenAsync("mgmt-token", Arg.Any<CancellationToken>())
            .Returns(poll);

        await _handler.Handle(new SetPollExpirationCommand("mgmt-token", expiresAt), CancellationToken.None);

        await _pollRepository.Received(1).UpdateAsync(
            Arg.Is<Poll>(p => p == poll),
            Arg.Any<CancellationToken>());
    }
}
