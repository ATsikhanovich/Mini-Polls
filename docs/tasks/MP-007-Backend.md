---
goal: Implement backend for MP-007 — Close a poll manually
version: 1.0
date_created: 2026-02-27
date_completed: 2026-02-27
status: 'Completed'
tags: feature, backend, management, close-poll
---

# MP-007 Backend — Close a Poll Manually

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

Implement the `ClosePoll` use case so that a poll creator can manually close their poll via the management token, preventing further votes. The domain layer already has `Poll.Close()` which sets `ClosedAt` and is idempotent. The repository already has `IPollRepository.UpdateAsync`. The `ExceptionHandlingMiddleware` already maps `PollClosedException` to 410 Gone for voters attempting to vote on a closed poll. The gap is the Application-layer command/handler/validator in the empty `ClosePoll/` folder (currently only `.gitkeep`), and the `POST /api/polls/{token}/close` controller action in `PollsController`. The management page already receives `IsClosed` and `ClosedAt` from the `GetPollByManagementToken` query, so no DTO changes are needed there.

## 1. Requirements & Constraints

- **REQ-001**: `POST /api/polls/{token}/close` marks the poll as closed and disables further voting — per backend instructions §6.1 endpoint table.
- **REQ-002**: After closing, the management page shows poll status as "Closed" — already covered by `ManagementPollDto.IsClosed` and `ManagementPollDto.ClosedAt` returned by the existing `GetPollByManagementToken` query.
- **REQ-003**: Voters visiting the poll after closure see the final results and a "Poll closed" notice — already enforced by `CastVoteCommandHandler` which throws `PollClosedException` when `poll.IsClosed` is true, and `GetPollBySlugQueryHandler`/`GetResultsQueryHandler` which include `IsClosed` in their DTOs.
- **REQ-004**: Return `200 OK` on successful close — per backend instructions §6.3.
- **REQ-005**: Return `404 Not Found` for unknown management tokens — per backend instructions §6.3.
- **REQ-006**: Closing an already-closed poll should be idempotent (not error) — `Poll.Close()` already handles this by returning early if `IsClosed` is true.
- **CON-001**: Application layer must not return domain entities — return a result DTO (backend instructions §4.2).
- **CON-002**: Handler depends only on `IPollRepository`, not on EF Core or infrastructure types.
- **PAT-001**: Follow the established command pattern: dedicated folder under `Application/Polls/ClosePoll/` with `*Command.cs`, `*CommandHandler.cs`, `*CommandValidator.cs`, and `*Result.cs` — mirroring `CastVoteCommand`.
- **PAT-002**: Controller stays thin — map HTTP concerns to MediatR, return status codes.
- **PAT-003**: Tests follow `MethodUnderTest_Scenario_ExpectedResult` naming, use NSubstitute for Application tests, and `MiniPollsWebApplicationFactory` for API integration tests.
- **GUD-001**: Use file-scoped namespaces, `sealed` classes, `record` for DTOs, primary constructors where appropriate.

## 2. Implementation Steps

### Phase 1 — Application Layer: Command, Handler, Validator, and Result

- GOAL-001: Create the `ClosePoll` use case in the Application layer.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | **Create `ClosePollCommand.cs`** in `backend/src/MiniPolls.Application/Polls/ClosePoll/`. Define `sealed record ClosePollCommand(string Token) : IRequest<ClosePollResult>`. The `Token` is the management token from the URL route parameter. | | |
| TASK-002 | **Create `ClosePollResult.cs`** in the same folder. Define `sealed record ClosePollResult(Guid Id, bool IsClosed, DateTimeOffset? ClosedAt)`. This lightweight result DTO confirms the poll was closed and includes the timestamp. The controller can return this to the frontend. | | |
| TASK-003 | **Create `ClosePollCommandValidator.cs`** in the same folder. Implement `AbstractValidator<ClosePollCommand>` with a single rule: `RuleFor(x => x.Token).NotEmpty()`. This follows the same pattern as `CastVoteCommandValidator`. | | |
| TASK-004 | **Create `ClosePollCommandHandler.cs`** in the same folder. Implement `IRequestHandler<ClosePollCommand, ClosePollResult>` with a primary constructor injecting `IPollRepository`. In `Handle`: (1) call `pollRepository.GetByManagementTokenAsync(request.Token, cancellationToken)`; (2) if null, throw `PollNotFoundException(request.Token)` — the middleware maps this to 404; (3) call `poll.Close()` — the domain method is idempotent, so closing an already-closed poll is a no-op; (4) call `pollRepository.UpdateAsync(poll, cancellationToken)` to persist the change; (5) return `new ClosePollResult(poll.Id, poll.IsClosed, poll.ClosedAt)`. | | |
| TASK-005 | **Delete the `.gitkeep` file** from `backend/src/MiniPolls.Application/Polls/ClosePoll/` since the folder now contains real files. | | |

### Phase 2 — API Layer: Controller Endpoint

- GOAL-002: Expose the `POST /api/polls/{token}/close` endpoint.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | **Add `ClosePoll` action** to `PollsController` in `backend/src/MiniPolls.Api/Controllers/PollsController.cs`. Add a new method: `[HttpPost("{token}/close")]` `public async Task<IActionResult> ClosePoll(string token, CancellationToken cancellationToken)`. Inside, send `new ClosePollCommand(token)` via `mediator.Send`. Return `Ok(result)`. The `PollNotFoundException` thrown by the handler will be caught by `ExceptionHandlingMiddleware` and mapped to 404. Add a `using` for `MiniPolls.Application.Polls.ClosePoll` at the top of the file. No request body is needed — the token in the route is sufficient. | | |

### Phase 3 — Application Unit Tests

- GOAL-003: Unit-test the `ClosePollCommandHandler` with mocked repository.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-007 | **Create folder** `backend/tests/MiniPolls.Application.Tests/Polls/ClosePoll/`. | | |
| TASK-008 | **Create `ClosePollCommandHandlerTests.cs`** in that folder. Create a `sealed` test class with a mocked `IPollRepository` (via NSubstitute) and a `ClosePollCommandHandler` instance, following the pattern in `GetPollByManagementTokenQueryHandlerTests`. | | |
| TASK-009 | **Test: `Handle_ValidToken_ActivePoll_ClosesPollAndReturnsResult`** — Arrange: create a `Poll` via `Poll.Create(...)`, mock `GetByManagementTokenAsync` to return the poll. Act: call `Handle` with the matching token. Assert: (a) result is not null; (b) `result.IsClosed` is true; (c) `result.ClosedAt` is not null and is close to `DateTimeOffset.UtcNow`; (d) `result.Id` matches `poll.Id`; (e) `pollRepository.UpdateAsync` was called once with the poll. | | |
| TASK-010 | **Test: `Handle_ValidToken_AlreadyClosedPoll_ReturnsResultWithoutError`** — Arrange: create a `Poll`, call `poll.Close()` to pre-close it, mock repo. Act: call `Handle`. Assert: (a) result is not null; (b) `result.IsClosed` is true; (c) no exception thrown; (d) `pollRepository.UpdateAsync` was still called (idempotent persist). This verifies the handler doesn't break on double-close. | | |
| TASK-011 | **Test: `Handle_InvalidToken_ThrowsPollNotFoundException`** — Arrange: mock `GetByManagementTokenAsync` returns null. Act/Assert: calling `Handle` throws `PollNotFoundException`. | | |
| TASK-012 | **Test: `Handle_ValidToken_CallsUpdateAsyncExactlyOnce`** — Arrange: create a `Poll`, mock repo. Act: call `Handle`. Assert: `pollRepository.UpdateAsync` received exactly 1 call with the poll instance and any `CancellationToken`. This verifies the handler persists the state change. | | |

### Phase 4 — Validator Unit Tests

- GOAL-004: Unit-test the `ClosePollCommandValidator`.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-013 | **Create `ClosePollCommandValidatorTests.cs`** in `backend/tests/MiniPolls.Application.Tests/Polls/ClosePoll/`. | | |
| TASK-014 | **Test: `Validate_NonEmptyToken_IsValid`** — Create a `ClosePollCommand("some-token")`, validate it, assert result is valid. | | |
| TASK-015 | **Test: `Validate_EmptyToken_IsInvalid`** — Create a `ClosePollCommand("")`, validate it, assert result is invalid with an error on the `Token` property. | | |

### Phase 5 — API Integration Tests

- GOAL-005: End-to-end test the `POST /api/polls/{token}/close` endpoint.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-016 | **Create `ClosePollEndpointTests.cs`** in `backend/tests/MiniPolls.Api.Tests/Polls/`. Use `IClassFixture<MiniPollsWebApplicationFactory>`, following the patterns established in `GetPollByManagementTokenEndpointTests`. Define inner response records: `CreatePollResponse(Guid Id, string Slug, string ManagementToken)`, `ClosePollResponse(Guid Id, bool IsClosed, DateTimeOffset? ClosedAt)`, `ManagementPollResponse(...)` (same shape as in existing tests), and `PollOptionDtoResponse(Guid Id, string Text, int SortOrder)`, `PollDtoResponse(Guid Id, string Question, string Slug, bool IsClosed, IReadOnlyList<PollOptionDtoResponse> Options)`. | | |
| TASK-017 | **Test: `Post_ValidToken_Returns200AndPollIsClosed`** — Arrange: create a poll via `POST /api/polls`, extract `ManagementToken`. Act: `POST /api/polls/{managementToken}/close`. Assert: status is `200 OK`; body deserializes to `ClosePollResponse`; `IsClosed` is true; `ClosedAt` is not null. | | |
| TASK-018 | **Test: `Post_ValidToken_AlreadyClosed_Returns200Idempotent`** — Arrange: create a poll, close it once via `POST /api/polls/{token}/close`. Act: close it again. Assert: status is still `200 OK`; `IsClosed` is true. Verifies idempotent behavior. | | |
| TASK-019 | **Test: `Post_InvalidToken_Returns404`** — Act: `POST /api/polls/nonexistent-token/close`. Assert: status is `404 Not Found`. | | |
| TASK-020 | **Test: `Post_ClosedPoll_VotingReturns410`** — Arrange: create a poll, retrieve option ID via `GET /api/polls/by-slug/{slug}`, close the poll via `POST /api/polls/{token}/close`. Act: attempt to vote via `POST /api/polls/{slug}/votes`. Assert: response status is `410 Gone`. Verifies the key acceptance criterion that closed polls reject votes. | | |
| TASK-021 | **Test: `Post_ClosedPoll_ManagementPageShowsClosed`** — Arrange: create a poll, close it via `POST /api/polls/{token}/close`. Act: `GET /api/polls/by-token/{token}`. Assert: response body shows `IsClosed` as true and `ClosedAt` is not null. Verifies the acceptance criterion "management page shows the poll status as Closed." | | |
| TASK-022 | **Test: `Post_ClosedPoll_VoterSeesResultsWithClosedStatus`** — Arrange: create a poll, cast a vote, close the poll. Act: `GET /api/polls/{slug}/results`. Assert: response contains results with `IsClosed` as true. Verifies "Voters visiting the poll after closure see the final results and a Poll closed notice." | | |

## 3. Alternatives

- **ALT-001: Return `204 No Content` instead of `200 OK` with body** — A `204` would indicate success without a response body. Rejected because returning the `ClosePollResult` DTO (with `Id`, `IsClosed`, `ClosedAt`) provides useful confirmation data to the frontend without requiring a follow-up `GET` call. The backend instructions §6.3 specify `200 OK` for successful updates.
- **ALT-002: Use the management token in a request body instead of the URL** — Would change the route to `POST /api/polls/close` with the token in the body. Rejected because the backend instructions §6.1 explicitly define the route as `POST /api/polls/{token}/close` with the token as a route parameter.
- **ALT-003: Return the full `ManagementPollDto` from the close endpoint** — Would give the frontend all poll data in one shot after closing. Rejected because it couples the close action to the management query logic and the frontend can simply re-fetch management data if needed. A minimal `ClosePollResult` keeps the command response lean.

## 4. Dependencies

- **DEP-001**: No new NuGet packages required. MediatR, FluentValidation, FluentAssertions, NSubstitute, and `Microsoft.AspNetCore.Mvc.Testing` are already referenced in the relevant projects.
- **DEP-002**: `IPollRepository.GetByManagementTokenAsync` and `IPollRepository.UpdateAsync` are already declared and implemented. No infrastructure changes needed.
- **DEP-003**: `Poll.Close()` domain method is already implemented and tested in `PollTests.cs`. No domain changes needed.
- **DEP-004**: `ExceptionHandlingMiddleware` already catches `PollNotFoundException` → 404 and `PollClosedException` → 410. No middleware changes needed.

## 5. Files

- **FILE-001**: `backend/src/MiniPolls.Application/Polls/ClosePoll/ClosePollCommand.cs` — New file. MediatR command record.
- **FILE-002**: `backend/src/MiniPolls.Application/Polls/ClosePoll/ClosePollResult.cs` — New file. Result DTO record.
- **FILE-003**: `backend/src/MiniPolls.Application/Polls/ClosePoll/ClosePollCommandValidator.cs` — New file. FluentValidation validator for the command.
- **FILE-004**: `backend/src/MiniPolls.Application/Polls/ClosePoll/ClosePollCommandHandler.cs` — New file. Handler that fetches poll by token, calls `Close()`, persists, and returns result.
- **FILE-005**: `backend/src/MiniPolls.Api/Controllers/PollsController.cs` — Modified. Add `ClosePoll` action method and `using` import.
- **FILE-006**: `backend/tests/MiniPolls.Application.Tests/Polls/ClosePoll/ClosePollCommandHandlerTests.cs` — New file. Four unit tests for the handler.
- **FILE-007**: `backend/tests/MiniPolls.Application.Tests/Polls/ClosePoll/ClosePollCommandValidatorTests.cs` — New file. Two unit tests for the validator.
- **FILE-008**: `backend/tests/MiniPolls.Api.Tests/Polls/ClosePollEndpointTests.cs` — New file. Six integration tests for the endpoint.
- **FILE-009**: `backend/src/MiniPolls.Application/Polls/ClosePoll/.gitkeep` — Deleted. No longer needed.

## 6. Testing

- **TEST-001**: `ClosePollCommandHandlerTests.Handle_ValidToken_ActivePoll_ClosesPollAndReturnsResult` — verifies poll is closed, result DTO is correct, and `ClosedAt` is set.
- **TEST-002**: `ClosePollCommandHandlerTests.Handle_ValidToken_AlreadyClosedPoll_ReturnsResultWithoutError` — verifies idempotent close on an already-closed poll.
- **TEST-003**: `ClosePollCommandHandlerTests.Handle_InvalidToken_ThrowsPollNotFoundException` — verifies 404 path.
- **TEST-004**: `ClosePollCommandHandlerTests.Handle_ValidToken_CallsUpdateAsyncExactlyOnce` — verifies persistence call.
- **TEST-005**: `ClosePollCommandValidatorTests.Validate_NonEmptyToken_IsValid` — happy-path validation.
- **TEST-006**: `ClosePollCommandValidatorTests.Validate_EmptyToken_IsInvalid` — empty token rejected.
- **TEST-007**: `ClosePollEndpointTests.Post_ValidToken_Returns200AndPollIsClosed` — end-to-end: create poll, close it, verify 200 with closed status.
- **TEST-008**: `ClosePollEndpointTests.Post_ValidToken_AlreadyClosed_Returns200Idempotent` — end-to-end: double-close returns 200.
- **TEST-009**: `ClosePollEndpointTests.Post_InvalidToken_Returns404` — end-to-end: bogus token returns 404.
- **TEST-010**: `ClosePollEndpointTests.Post_ClosedPoll_VotingReturns410` — end-to-end: close poll then attempt vote, verify 410 Gone.
- **TEST-011**: `ClosePollEndpointTests.Post_ClosedPoll_ManagementPageShowsClosed` — end-to-end: close poll, fetch management endpoint, verify `IsClosed` true.
- **TEST-012**: `ClosePollEndpointTests.Post_ClosedPoll_VoterSeesResultsWithClosedStatus` — end-to-end: close poll, fetch results, verify `IsClosed` true.

## 7. Risks & Assumptions

- **RISK-001**: The `POST /api/polls/{token}/close` route uses the management token as a route parameter. If another endpoint has a conflicting route pattern (e.g., `POST /api/polls/{slug}/votes`), ASP.NET routing must disambiguate. Since `{token}/close` has a literal `/close` suffix, it will not conflict with `{slug}/votes` or `{slug}/results`. No risk here.
- **ASSUMPTION-001**: Closing a poll is permanent — there is no "reopen" action. The `Poll.Close()` method sets `ClosedAt` and has no corresponding `Open()` method. This is consistent with the PRD which only mentions closing, not reopening.
- **ASSUMPTION-002**: The `200 OK` response with `ClosePollResult` is sufficient for the frontend. The management page can re-fetch full poll data via `GET /api/polls/by-token/{token}` after closing if it needs the complete `ManagementPollDto`.
- **ASSUMPTION-003**: No authorization beyond the management token is required — the token in the URL is the sole access control, consistent with the PRD and backend instructions §11.

## 8. Related Specifications / Further Reading

- [PRD — MP-007 User Story](docs/PRD.md) — "Close a poll manually" acceptance criteria (§10.7).
- [Backend Instructions §4.1](../.github/instructions/backend.instructions.md) — Application layer use case folder structure with `ClosePoll/` listed.
- [Backend Instructions §6.1](../.github/instructions/backend.instructions.md) — Endpoint table: `POST /api/polls/{token}/close` → `ClosePollCommand`.
- [Backend Instructions §6.3](../.github/instructions/backend.instructions.md) — Response conventions (200 OK, 404 Not Found, 410 Gone).
- [MP-006 Backend Plan](docs/tasks/MP-006-Backend.md) — Prior plan that implemented `GetPollByManagementToken` query (management page).
- [MP-003 Backend Plan](docs/tasks/MP-003-Backend.md) — Prior plan that implemented voting, results, and the `PollClosedException` handling.

## Verification

- `dotnet build` from `backend/` — zero errors, zero warnings.
- `dotnet test` from `backend/` — all existing tests still pass, plus the 12 new tests (4 handler + 2 validator + 6 endpoint) pass.
- Manual: create a poll via `POST /api/polls`, note the `managementToken`. Then `POST /api/polls/{managementToken}/close` — verify 200 with `IsClosed: true` and `ClosedAt` set. Re-close the same poll — verify 200 again (idempotent). Attempt `POST /api/polls/{slug}/votes` — verify 410 Gone. Fetch `GET /api/polls/by-token/{managementToken}` — verify `IsClosed: true`. Fetch `GET /api/polls/{slug}/results` — verify `IsClosed: true`. Try `POST /api/polls/bogus-token/close` — verify 404.
