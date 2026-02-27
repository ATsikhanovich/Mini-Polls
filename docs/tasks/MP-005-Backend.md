# MP-005 Backend — Prevent Duplicate Votes

## TL;DR

User story MP-005 requires that the backend prevents the same IP address from voting twice on the same poll and returns current results when a duplicate is detected. Nearly all of this is already implemented: the `CastVoteCommandHandler` checks `IVoteRepository.HasVotedAsync` and throws `DuplicateVoteException`, the `CheckVoteQueryHandler` powers a pre-flight `vote-check` endpoint, and the `ExceptionHandlingMiddleware` maps duplicate votes to 409 Conflict. The one remaining gap is that the 409 response body contains only a `ProblemDetails` object — the backend instructions (§6.3) require it to **include the current poll results** so the frontend can display them without a second API call. The fix involves catching `DuplicateVoteException` in `PollsController.CastVote`, querying results via `GetResultsQuery`, and returning a 409 with a combined response body. One new Application.Tests test and one updated Api.Tests test complete the verification.

## Steps

### Phase 1 — Enrich 409 Duplicate Vote Response with Poll Results

1. **Remove `DuplicateVoteException` catch from `ExceptionHandlingMiddleware`** — In [ExceptionHandlingMiddleware.cs](backend/src/MiniPolls.Api/Middleware/ExceptionHandlingMiddleware.cs#L34-L38), delete the `catch (DuplicateVoteException ex)` block. The controller will now handle this exception directly so it can enrich the response with results. The middleware's remaining catches (`PollNotFoundException`, `PollClosedException`, generic `DomainException`) stay unchanged as fallback handlers.

2. **Define `DuplicateVoteResponse` record** — Add a new nested record inside [PollsController.cs](backend/src/MiniPolls.Api/Controllers/PollsController.cs) (alongside existing `CreatePollRequest` / `CastVoteRequest`):
   - Properties: `string Message`, `PollResultsDto Results`.
   - This is a thin API-layer DTO that wraps the existing `PollResultsDto` from the Application layer with a human-readable duplicate-vote message.

3. **Update `PollsController.CastVote` action** — In [PollsController.cs](backend/src/MiniPolls.Api/Controllers/PollsController.cs#L50-L58):
   - Wrap the `mediator.Send(command)` call in a try-catch for `DuplicateVoteException`.
   - In the catch block, send a `GetResultsQuery(slug)` via MediatR to retrieve current poll results.
   - Return `Conflict(new DuplicateVoteResponse("You have already voted on this poll.", results))` — this yields a 409 status with results in the JSON body.
   - The happy path (`200 OK` with `CastVoteResult`) remains unchanged.
   - Import `MiniPolls.Domain.Exceptions` and `MiniPolls.Application.Votes.GetResults` at the top of the file.

### Phase 2 — Update Existing Tests

4. **Update `CastVoteEndpointTests.Post_DuplicateVote_Returns409`** — In [CastVoteEndpointTests.cs](backend/tests/MiniPolls.Api.Tests/Polls/CastVoteEndpointTests.cs#L37-L51):
   - After asserting `HttpStatusCode.Conflict`, deserialize the response body into a new `DuplicateVoteResultResponse` record with properties `string Message` and a nested results object.
   - Assert that `Message` is not empty.
   - Assert that the results object contains the poll question, total votes ≥ 1, and the correct number of options.
   - Add the `DuplicateVoteResultResponse` and its nested types as private records at the bottom of the test class (following the existing pattern with `CastVoteResultResponse`, `CreatePollResponse`, etc.).

5. **Add `CastVoteCommandHandler` test confirming vote is NOT persisted on duplicate** — In [CastVoteCommandHandlerTests.cs](backend/tests/MiniPolls.Application.Tests/Votes/CastVote/CastVoteCommandHandlerTests.cs):
   - New test: `Handle_DuplicateIp_DoesNotCallAddAsync` — same setup as the existing `Handle_DuplicateIp_ThrowsDuplicateVoteException` test, but after catching the exception, assert that `IVoteRepository.AddAsync` was **never** called. This directly verifies acceptance criterion 3 ("The duplicate vote is not recorded in the database").
   - This complements the existing test which only checks that the exception is thrown.

### Phase 3 — Verify Existing Coverage (No Changes Needed)

The following components already fully satisfy MP-005's acceptance criteria. No modifications required — listed here for traceability.

6. **Domain layer** — `DuplicateVoteException` in [DuplicateVoteException.cs](backend/src/MiniPolls.Domain/Exceptions/DuplicateVoteException.cs) exists with the correct message.

7. **Application layer — `CastVoteCommandHandler`** — In [CastVoteCommandHandler.cs](backend/src/MiniPolls.Application/Votes/CastVote/CastVoteCommandHandler.cs#L26-L28), the handler calls `IVoteRepository.HasVotedAsync(poll.Id, request.IpAddress)` and throws `DuplicateVoteException` if true. The vote is never persisted on duplicate. This is the core enforcement of MP-005.

8. **Application layer — `CheckVoteQueryHandler`** — In [CheckVoteQueryHandler.cs](backend/src/MiniPolls.Application/Votes/CheckVote/CheckVoteQueryHandler.cs), the handler returns a boolean indicating whether the IP has already voted. This powers the frontend pre-flight check.

9. **Infrastructure layer — `VoteRepository.HasVotedAsync`** — In [VoteRepository.cs](backend/src/MiniPolls.Infrastructure/Persistence/Repositories/VoteRepository.cs#L11-L14), the query checks `v.Option!.PollId == pollId && v.IpAddress == ipAddress`, correctly detecting duplicates at the poll level (not just the option level).

10. **Infrastructure layer — DB unique index** — In [VoteConfiguration.cs](backend/src/MiniPolls.Infrastructure/Persistence/Configurations/VoteConfiguration.cs#L19-L20), a unique index on `(PollOptionId, IpAddress)` provides a DB-level safety net per option. The application-level check in `CastVoteCommandHandler` is the primary guard at the poll level.

11. **API layer — `PollsController.CheckVote`** — In [PollsController.cs](backend/src/MiniPolls.Api/Controllers/PollsController.cs#L73-L79), the `GET /api/polls/{slug}/vote-check` endpoint reads the voter IP and returns `{ hasVoted: true/false }`.

12. **Existing tests** — The following tests already pass and cover MP-005 behavior:
    - [CastVoteCommandHandlerTests.Handle_DuplicateIp_ThrowsDuplicateVoteException](backend/tests/MiniPolls.Application.Tests/Votes/CastVote/CastVoteCommandHandlerTests.cs#L79-L95)
    - [CheckVoteQueryHandlerTests](backend/tests/MiniPolls.Application.Tests/Votes/CheckVote/CheckVoteQueryHandlerTests.cs) — all three tests
    - [CastVoteEndpointTests.Post_DuplicateVote_Returns409](backend/tests/MiniPolls.Api.Tests/Polls/CastVoteEndpointTests.cs#L37)
    - [CheckVoteEndpointTests](backend/tests/MiniPolls.Api.Tests/Polls/CheckVoteEndpointTests.cs) — both tests

## Verification

- `dotnet build` from `backend/` — zero errors, zero warnings.
- `dotnet test` from `backend/` — all existing tests pass, plus the new/updated tests in steps 4 and 5 pass.
- Manual: create a poll via `POST /api/polls`, cast a vote via `POST /api/polls/{slug}/votes`, then cast the same vote again from the same IP. The second request should return `409 Conflict` with a JSON body containing both a `message` field and a `results` object with the poll question, total votes, and per-option breakdown.

## Alternatives

- **ALT-001: Enrich the response in the middleware instead of the controller** — Resolve `IMediator` from `HttpContext.RequestServices` inside the `DuplicateVoteException` catch in the middleware, send `GetResultsQuery`, and write a custom response body. Rejected because it couples the middleware to Application-layer query types and breaks the pattern of the middleware producing only `ProblemDetails` responses. The controller is the appropriate place to compose richer HTTP responses.
- **ALT-002: Change `CastVoteCommandHandler` to return a result union** — Use a discriminated result type (e.g., `OneOf<CastVoteResult, PollResultsDto>`) so the handler returns results on duplicate instead of throwing. Rejected because it requires a new library dependency (`OneOf`) and changes the handler contract; the existing exception-based flow is consistent with the other domain exceptions (`PollClosedException`, `PollNotFoundException`).
- **ALT-003: Add `PollId` column to `Vote` entity for a poll-level unique DB constraint** — Would replace the current `(PollOptionId, IpAddress)` unique index with a `(PollId, IpAddress)` index, closing a theoretical race condition where two concurrent requests for the same IP could both pass `HasVotedAsync`. Deferred because: (a) SQLite uses database-level write locking, making concurrent write races essentially impossible; (b) the entity change requires a new migration; (c) the application-level check is the primary enforcement and already works correctly for single-instance deployments.

## Dependencies

- **DEP-001**: No new NuGet packages required. All necessary types (`PollResultsDto`, `GetResultsQuery`, `DuplicateVoteException`, `IMediator`) are already available in the projects that need them.

## Files

- **FILE-001**: [backend/src/MiniPolls.Api/Controllers/PollsController.cs](backend/src/MiniPolls.Api/Controllers/PollsController.cs) — Add `DuplicateVoteResponse` record; update `CastVote` action with try-catch to return 409 with results.
- **FILE-002**: [backend/src/MiniPolls.Api/Middleware/ExceptionHandlingMiddleware.cs](backend/src/MiniPolls.Api/Middleware/ExceptionHandlingMiddleware.cs) — Remove non functional `DuplicateVoteException` catch block (controller now handles it).
- **FILE-003**: [backend/tests/MiniPolls.Api.Tests/Polls/CastVoteEndpointTests.cs](backend/tests/MiniPolls.Api.Tests/Polls/CastVoteEndpointTests.cs) — Update duplicate vote test to verify response body includes results.
- **FILE-004**: [backend/tests/MiniPolls.Application.Tests/Votes/CastVote/CastVoteCommandHandlerTests.cs](backend/tests/MiniPolls.Application.Tests/Votes/CastVote/CastVoteCommandHandlerTests.cs) — Add `Handle_DuplicateIp_DoesNotCallAddAsync` test.

## Testing

- **TEST-001**: Update `CastVoteEndpointTests.Post_DuplicateVote_Returns409` — verify the 409 response body deserializes to a `DuplicateVoteResultResponse` containing a non-empty `Message` and a `Results` object with the poll question, at least 1 total vote, and the expected number of options.
- **TEST-002**: Add `CastVoteCommandHandlerTests.Handle_DuplicateIp_DoesNotCallAddAsync` — arrange: mock `HasVotedAsync` returns true; act: call handler and catch exception; assert: `IVoteRepository.AddAsync` received zero calls.
- **TEST-003**: (Existing, no changes) `CastVoteCommandHandlerTests.Handle_DuplicateIp_ThrowsDuplicateVoteException` — confirms the exception is thrown.
- **TEST-004**: (Existing, no changes) `CheckVoteQueryHandlerTests` — confirms pre-flight vote check returns correct boolean.
- **TEST-005**: (Existing, no changes) `CheckVoteEndpointTests` — confirms `GET /api/polls/{slug}/vote-check` returns `{ hasVoted: true/false }`.

## Risks & Assumptions

- **RISK-001**: Removing the `DuplicateVoteException` catch from the middleware means if a future endpoint also triggers this exception without handling it in the controller, it will fall through to the generic `DomainException` catch and return 400 instead of 409. Mitigation: the `CastVote` action is the only place that can trigger `DuplicateVoteException`; if new endpoints arise, they should handle it similarly.
- **ASSUMPTION-001**: The frontend will use the results included in the 409 response body to render the results page, rather than making a separate `GET /api/polls/{slug}/results` call after receiving a 409.
- **ASSUMPTION-002**: SQLite's database-level write locking is sufficient to prevent race conditions in duplicate vote detection for a single-instance hobby deployment. No additional concurrency control (e.g., database-level unique constraint at the poll level) is needed at this time.

## Related Specifications / Further Reading

- [PRD — MP-005 User Story](docs/PRD.md) — "Prevent duplicate votes" acceptance criteria.
- [Backend Instructions §6.3](../.github/instructions/backend.instructions.md) — API response conventions, specifically: "Return 409 Conflict when a duplicate vote is detected (include current results in body)."
- [MP-003 Backend Plan](docs/tasks/MP-003-Backend.md) — Prior plan that originally implemented the `CastVote`, `CheckVote`, and `GetResults` use cases.
