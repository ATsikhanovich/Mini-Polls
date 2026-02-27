# MP-003 Backend — Vote on a Poll

## TL;DR

Implement the `POST /api/polls/{slug}/votes` endpoint so voters can cast a single vote on an active poll. This requires building three Application use cases (`CastVote` command, `GetPollBySlug` query, `GetResults` query) and extending the `PollsController` with three new actions. The `CastVote` handler enforces two domain rules: the poll must not be closed, and the voter's IP must not have already voted. The `GetPollBySlug` query powers the voting page (returns question + options), while `GetResults` returns aggregated vote counts and percentages. The controller reads the voter's IP from `HttpContext` and passes it into the MediatR command. Tests cover all three handlers/validators (Application.Tests) and all three endpoints (Api.Tests).

## Steps

### Application Layer — `GetPollBySlug` query

1. **Delete `.gitkeep`** from `src/MiniPolls.Application/Polls/GetPollBySlug/`.

2. **Create `PollDto`** — Add a new record in `src/MiniPolls.Application/Polls/GetPollBySlug/PollDto.cs`:
   - Properties: `Guid Id`, `string Question`, `string Slug`, `bool IsClosed`, `DateTimeOffset? ExpiresAt`, `DateTimeOffset CreatedAt`, `IReadOnlyList<PollOptionDto> Options`.
   - Nested record `PollOptionDto` with: `Guid Id`, `string Text`, `int SortOrder`.
   - This DTO deliberately omits `ManagementToken` — it is the public-facing view.

3. **Create `GetPollBySlugQuery`** — Add in `src/MiniPolls.Application/Polls/GetPollBySlug/GetPollBySlugQuery.cs`:
   - `sealed record GetPollBySlugQuery(string Slug) : IRequest<PollDto?>`.

4. **Create `GetPollBySlugQueryHandler`** — Add in `src/MiniPolls.Application/Polls/GetPollBySlug/GetPollBySlugQueryHandler.cs`:
   - Inject `IPollRepository`.
   - Call `IPollRepository.GetBySlugAsync(request.Slug)`.
   - If null, return `null` (controller maps to 404).
   - Map the `Poll` entity to `PollDto`, ordering options by `SortOrder`.

### Application Layer — `CastVote` command

5. **Delete `.gitkeep`** from `src/MiniPolls.Application/Votes/CastVote/`.

6. **Create `CastVoteResult`** — Add in `src/MiniPolls.Application/Votes/CastVote/CastVoteResult.cs`:
   - `sealed record CastVoteResult(Guid VoteId, Guid PollOptionId, DateTimeOffset CastAt)`.
   - Minimal confirmation DTO; the frontend will call `GetResults` separately, or the controller can include results in the response body.

7. **Create `CastVoteCommand`** — Add in `src/MiniPolls.Application/Votes/CastVote/CastVoteCommand.cs`:
   - `sealed record CastVoteCommand(string Slug, Guid OptionId, string IpAddress) : IRequest<CastVoteResult>`.
   - `IpAddress` is passed in from the controller — the handler has no dependency on `HttpContext`.

8. **Create `CastVoteCommandValidator`** — Add in `src/MiniPolls.Application/Votes/CastVote/CastVoteCommandValidator.cs`:
   - `Slug` must not be empty.
   - `OptionId` must not be `Guid.Empty`.
   - `IpAddress` must not be empty.

9. **Create `CastVoteCommandHandler`** — Add in `src/MiniPolls.Application/Votes/CastVote/CastVoteCommandHandler.cs`:
   - Inject `IPollRepository` and `IVoteRepository`.
   - Retrieve the poll via `IPollRepository.GetBySlugAsync(request.Slug)`. If null, throw a domain-specific not-found exception (see step 11).
   - Check `poll.IsClosed` — if true, throw a `PollClosedException` (see step 12).
   - Validate that `request.OptionId` belongs to one of the poll's options — if not, throw `DomainException("Invalid option for this poll.")`.
   - Check `IVoteRepository.HasVotedAsync(poll.Id, request.IpAddress)` — if true, throw a `DuplicateVoteException` (see step 13).
   - Create the vote: `Vote.Create(request.OptionId, request.IpAddress)`.
   - Persist via `IVoteRepository.AddAsync(vote)`.
   - Return `CastVoteResult` with the vote details.

### Application Layer — `GetResults` query

10. **Delete `.gitkeep`** from `src/MiniPolls.Application/Votes/GetResults/`.

11. **Create `PollResultsDto`** — Add in `src/MiniPolls.Application/Votes/GetResults/PollResultsDto.cs`:
    - `sealed record PollResultsDto(string Question, bool IsClosed, int TotalVotes, IReadOnlyList<OptionResultDto> Options)`.
    - `sealed record OptionResultDto(Guid Id, string Text, int VoteCount, double Percentage)`.

12. **Create `GetResultsQuery`** — Add in `src/MiniPolls.Application/Votes/GetResults/GetResultsQuery.cs`:
    - `sealed record GetResultsQuery(string Slug) : IRequest<PollResultsDto?>`.

13. **Create `GetResultsQueryHandler`** — Add in `src/MiniPolls.Application/Votes/GetResults/GetResultsQueryHandler.cs`:
    - Inject `IPollRepository`.
    - Retrieve poll via `GetBySlugAsync` (the existing repository already includes `.Include(p => p.Options).ThenInclude(o => o.Votes)`).
    - If null, return null.
    - Compute `TotalVotes` = sum of all option vote counts.
    - For each option: `VoteCount` = `option.Votes.Count`, `Percentage` = `TotalVotes > 0 ? (double)VoteCount / TotalVotes * 100 : 0`.
    - Map to `PollResultsDto`, ordered by `SortOrder`.

### Domain Layer — New exception types

14. **Create `PollNotFoundException`** — Add in `src/MiniPolls.Domain/Exceptions/PollNotFoundException.cs`:
    - Extends `DomainException`.
    - Constructor: `PollNotFoundException(string slug)` with message `$"Poll with slug '{slug}' was not found."`.
    - The exception handler middleware will map this to 404 (see step 18).

15. **Create `PollClosedException`** — Add in `src/MiniPolls.Domain/Exceptions/PollClosedException.cs`:
    - Extends `DomainException`.
    - Constructor: `PollClosedException()` with message `"This poll is closed and no longer accepting votes."`.
    - The middleware will map this to 410 Gone.

16. **Create `DuplicateVoteException`** — Add in `src/MiniPolls.Domain/Exceptions/DuplicateVoteException.cs`:
    - Extends `DomainException`.
    - Constructor: `DuplicateVoteException()` with message `"You have already voted on this poll."`.
    - The middleware will map this to 409 Conflict.

### API Layer — Extend `ExceptionHandlingMiddleware`

17. **Update `ExceptionHandlingMiddleware`** — In `src/MiniPolls.Api/Middleware/ExceptionHandlingMiddleware.cs`:
    - Add a catch for `PollNotFoundException` **before** the generic `DomainException` catch. Return `404 Not Found` with a `ProblemDetails` body.
    - Add a catch for `PollClosedException`. Return `410 Gone` with a `ProblemDetails` body.
    - Add a catch for `DuplicateVoteException`. Return `409 Conflict` with a `ProblemDetails` body.
    - The order of catch clauses matters: most-specific exception types first, `DomainException` last among domain exceptions.

### API Layer — Extend `PollsController`

18. **Add `GetPollBySlug` action** to `src/MiniPolls.Api/Controllers/PollsController.cs`:
    - `[HttpGet("by-slug/{slug}")]`.
    - Sends `GetPollBySlugQuery(slug)` via MediatR.
    - Returns `200 OK` with `PollDto` body, or `404 Not Found` if result is null.

19. **Add `CastVote` action** to `src/MiniPolls.Api/Controllers/PollsController.cs`:
    - `[HttpPost("{slug}/votes")]`.
    - Define a `CastVoteRequest` record with a single property: `Guid OptionId`. (The slug comes from the route, the IP from the context.)
    - Read voter IP: `HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown"`.
    - Map to `CastVoteCommand(slug, request.OptionId, ipAddress)`.
    - Send via MediatR.
    - Return `200 OK` with the `CastVoteResult`.
    - Exception-to-status mapping is handled by the middleware (409 for duplicate, 410 for closed, 404 for unknown slug).

20. **Add `GetResults` action** to `src/MiniPolls.Api/Controllers/PollsController.cs`:
    - `[HttpGet("{slug}/results")]`.
    - Sends `GetResultsQuery(slug)` via MediatR.
    - Returns `200 OK` with `PollResultsDto` body, or `404 Not Found` if null.

### Application Layer — `CheckVote` query (needed by frontend)

21. **Delete `.gitkeep`** from `src/MiniPolls.Application/Votes/CheckVote/`.

22. **Create `CheckVoteQuery`** — Add in `src/MiniPolls.Application/Votes/CheckVote/CheckVoteQuery.cs`:
    - `sealed record CheckVoteQuery(string Slug, string IpAddress) : IRequest<bool>`.

23. **Create `CheckVoteQueryHandler`** — Add in `src/MiniPolls.Application/Votes/CheckVote/CheckVoteQueryHandler.cs`:
    - Inject `IPollRepository` and `IVoteRepository`.
    - Retrieve poll by slug. If null, throw `PollNotFoundException`.
    - Return result of `IVoteRepository.HasVotedAsync(poll.Id, request.IpAddress)`.

24. **Add `CheckVote` action** to `src/MiniPolls.Api/Controllers/PollsController.cs`:
    - `[HttpGet("{slug}/vote-check")]`.
    - Read the voter IP from `HttpContext.Connection.RemoteIpAddress`.
    - Send `CheckVoteQuery(slug, ipAddress)` via MediatR.
    - Return `200 OK` with `{ "hasVoted": true/false }`.

### Tests — Application.Tests

25. **`tests/MiniPolls.Application.Tests/Votes/CastVote/CastVoteCommandHandlerTests.cs`**:
    - `Handle_ValidVote_CreatesVoteAndReturnsResult` — mock `IPollRepository` to return an active poll with matching option, mock `IVoteRepository.HasVotedAsync` to return false. Assert `IVoteRepository.AddAsync` is called with a `Vote` entity pointing to the correct option and IP.
    - `Handle_PollNotFound_ThrowsPollNotFoundException` — mock `GetBySlugAsync` returns null. Assert throws `PollNotFoundException`.
    - `Handle_PollClosed_ThrowsPollClosedException` — mock returns a closed poll (use `Poll.Create` then `poll.Close()`). Assert throws `PollClosedException`.
    - `Handle_DuplicateIp_ThrowsDuplicateVoteException` — mock `HasVotedAsync` returns true. Assert throws `DuplicateVoteException`.
    - `Handle_InvalidOptionId_ThrowsDomainException` — mock returns a poll but `OptionId` doesn't match any option. Assert throws `DomainException`.

26. **`tests/MiniPolls.Application.Tests/Votes/CastVote/CastVoteCommandValidatorTests.cs`**:
    - `Validate_ValidCommand_Passes`.
    - `Validate_EmptySlug_Fails`.
    - `Validate_EmptyOptionId_Fails`.
    - `Validate_EmptyIpAddress_Fails`.

27. **`tests/MiniPolls.Application.Tests/Polls/GetPollBySlug/GetPollBySlugQueryHandlerTests.cs`**:
    - `Handle_ExistingSlug_ReturnsPollDto` — mock returns a poll with options. Assert mapped DTO has correct fields and options are sorted.
    - `Handle_NonExistentSlug_ReturnsNull` — mock returns null. Assert result is null.

28. **`tests/MiniPolls.Application.Tests/Votes/GetResults/GetResultsQueryHandlerTests.cs`**:
    - `Handle_PollWithVotes_ReturnsCorrectCountsAndPercentages` — mock returns a poll with options and votes. Assert each option has correct `VoteCount` and `Percentage`, and `TotalVotes` is correct.
    - `Handle_PollWithNoVotes_ReturnsZeroPercentages` — mock returns a poll with no votes. Assert all percentages and counts are 0.
    - `Handle_NonExistentSlug_ReturnsNull`.

29. **`tests/MiniPolls.Application.Tests/Votes/CheckVote/CheckVoteQueryHandlerTests.cs`**:
    - `Handle_HasVoted_ReturnsTrue`.
    - `Handle_HasNotVoted_ReturnsFalse`.
    - `Handle_PollNotFound_ThrowsPollNotFoundException`.

### Tests — Api.Tests

30. **`tests/MiniPolls.Api.Tests/Polls/CastVoteEndpointTests.cs`**:
    - `Post_ValidVote_Returns200WithVoteResult` — create a poll first, then POST a vote with a valid option ID. Assert 200 and response contains vote details.
    - `Post_DuplicateVote_Returns409` — create a poll, vote once, vote again from same client. Assert 409 Conflict.
    - `Post_ClosedPoll_Returns410` — create a poll, close it via management endpoint (or directly via DB in test setup), then POST a vote. Assert 410 Gone.
    - `Post_NonExistentSlug_Returns404` — POST to a non-existent slug. Assert 404.
    - `Post_InvalidOptionId_Returns400` — create a poll, POST vote with a random Guid that is not a valid option. Assert 400.

31. **`tests/MiniPolls.Api.Tests/Polls/GetPollBySlugEndpointTests.cs`**:
    - `Get_ExistingSlug_Returns200WithPollDto` — create a poll, GET by slug. Assert 200 and response includes question and options.
    - `Get_NonExistentSlug_Returns404`.

32. **`tests/MiniPolls.Api.Tests/Polls/GetResultsEndpointTests.cs`**:
    - `Get_PollWithVotes_Returns200WithResults` — create a poll, cast a vote, GET results. Assert 200 with correct counts and percentages.
    - `Get_PollWithNoVotes_Returns200WithZeroCounts` — create a poll, GET results. Assert all counts are 0.
    - `Get_NonExistentSlug_Returns404`.

33. **`tests/MiniPolls.Api.Tests/Polls/CheckVoteEndpointTests.cs`**:
    - `Get_HasNotVoted_Returns200WithFalse` — create a poll, GET vote-check. Assert `hasVoted` is false.
    - `Get_HasVoted_Returns200WithTrue` — create a poll, vote, GET vote-check. Assert `hasVoted` is true.

## Verification

- `dotnet build` from `backend/` — zero errors, zero warnings.
- `dotnet test` from `backend/` — all existing tests pass, plus all new Application and API tests pass.
- Manual: create a poll via `POST /api/polls`, retrieve it via `GET /api/polls/by-slug/{slug}`, cast a vote via `POST /api/polls/{slug}/votes` with `{ "optionId": "<guid>" }`, view results via `GET /api/polls/{slug}/results`, and check the vote-check endpoint `GET /api/polls/{slug}/vote-check`.

## Decisions

- **Three custom exception types** (`PollNotFoundException`, `PollClosedException`, `DuplicateVoteException`): These extend `DomainException` and let the middleware return the correct HTTP status without coupling handlers to HTTP semantics. The middleware catches them in order from most-specific to least-specific.
- **Separate `GetPollBySlug` and `GetResults` queries**: The voting page needs a lightweight poll view (question + options without vote counts), while the results page needs aggregated data. Keeping them separate follows CQRS and avoids leaking vote data to the voting form.
- **`CastVoteResult` is minimal**: The controller returns just the vote confirmation. The frontend is expected to navigate to the results page and call `GetResults` separately, matching the PRD's UX flow ("submits the vote and displays the results page").
- **`CheckVote` included**: Although MP-005 (duplicate prevention) is a separate story, the `vote-check` endpoint is listed in the API contract and is needed for the frontend voting page to decide whether to show the form or the results. Including it here avoids a partial voting implementation.
- **IP reading in controller**: The controller extracts `RemoteIpAddress` from `HttpContext.Connection` and passes it as a string into the command. `ForwardedHeadersMiddleware` is already registered in `Program.cs`, so `X-Forwarded-For` is handled.
- **Mocking library**: NSubstitute is already a dependency of `MiniPolls.Application.Tests` — no new packages needed.
- **No new NuGet packages required**: All dependencies (MediatR, FluentValidation, NSubstitute, FluentAssertions, xUnit, WebApplicationFactory) are already present in the projects.
