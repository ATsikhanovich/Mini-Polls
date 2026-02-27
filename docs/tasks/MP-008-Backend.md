---
goal: Implement backend for MP-008 — Set poll expiration
version: 1.0
date_created: 2026-02-27
date_completed: 2026-02-27
status: 'Completed'
tags: feature, backend, management, expiration
---

# MP-008 Backend — Set Poll Expiration

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

Implement the `SetPollExpiration` use case so that a poll creator can set or update the expiration date/time for an active poll via the management token. The domain layer already has `Poll.SetExpiration(DateTimeOffset)` which validates that the poll is not closed and that the date is in the future. The repository already has `IPollRepository.UpdateAsync`. The `ExceptionHandlingMiddleware` already maps `DomainException` to 400 Bad Request and `PollNotFoundException` to 404 Not Found. The gap is the Application-layer command/handler/validator in the empty `SetPollExpiration/` folder (currently only `.gitkeep`), and the `PUT /api/polls/{token}/expiration` controller action in `PollsController`. The management page already receives `ExpiresAt` from the `GetPollByManagementToken` query via `ManagementPollDto`, and the public `PollDto` also includes `ExpiresAt`, so no DTO changes are needed for those queries. Poll creation already supports an optional `ExpiresAt` parameter — this story adds the ability to *update* it after creation.

## 1. Requirements & Constraints

- **REQ-001**: `PUT /api/polls/{token}/expiration` sets or updates the poll's expiration date/time — per backend instructions §6.1 endpoint table mapping to `SetPollExpirationCommand`.
- **REQ-002**: On the management page, the creator can set or update the expiration date/time for an active poll — the management page already renders `ExpiresAt` from `ManagementPollDto`.
- **REQ-003**: The expiration date/time must be in the future — enforced by `Poll.SetExpiration()` domain method which throws `DomainException("Expiration date must be in the future.")`.
- **REQ-004**: When the expiration time is reached, the poll is automatically marked as closed — already implemented via `Poll.IsClosed` computed property which checks `ExpiresAt <= DateTimeOffset.UtcNow`.
- **REQ-005**: Voters visiting an expired poll see the final results and a "Poll expired" notice — already handled by `CastVoteCommandHandler` which checks `poll.IsClosed` (throws `PollClosedException`) and by `PollDto.IsClosed` / `PollResultsDto.IsClosed` in read queries.
- **REQ-006**: Cannot set expiration on a closed poll — enforced by `Poll.SetExpiration()` which throws `DomainException("Cannot set expiration on a closed poll.")`.
- **REQ-007**: Return `200 OK` on successful expiration update — per backend instructions §6.3.
- **REQ-008**: Return `404 Not Found` for unknown management tokens — per backend instructions §6.3.
- **REQ-009**: Return `400 Bad Request` for validation failures (empty token, missing/past expiration date) — per backend instructions §6.3, handled by `ValidationBehaviour` and `ExceptionHandlingMiddleware`.
- **CON-001**: Application layer must not return domain entities — return a result DTO (backend instructions §4.2).
- **CON-002**: Handler depends only on `IPollRepository`, not on EF Core or infrastructure types.
- **PAT-001**: Follow the established command pattern: dedicated folder under `Application/Polls/SetPollExpiration/` with `*Command.cs`, `*CommandHandler.cs`, `*CommandValidator.cs`, and `*Result.cs` — mirroring `ClosePollCommand` and `CastVoteCommand`.
- **PAT-002**: Controller stays thin — map HTTP concerns to MediatR, return status codes.
- **PAT-003**: Tests follow `MethodUnderTest_Scenario_ExpectedResult` naming, use NSubstitute for Application tests, and `MiniPollsWebApplicationFactory` for API integration tests.
- **GUD-001**: Use file-scoped namespaces, `sealed` classes, `record` for DTOs, primary constructors where appropriate.

## 2. Implementation Steps

### Phase 1 — Application Layer: Command, Handler, Validator, and Result

- GOAL-001: Create the `SetPollExpiration` use case in the Application layer, filling the currently empty `SetPollExpiration/` folder.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | **Create `SetPollExpirationCommand.cs`** in `backend/src/MiniPolls.Application/Polls/SetPollExpiration/`. Define `sealed record SetPollExpirationCommand(string Token, DateTimeOffset ExpiresAt) : IRequest<SetPollExpirationResult>`. The `Token` is the management token from the URL route parameter. `ExpiresAt` is the new expiration date/time from the request body. | | |
| TASK-002 | **Create `SetPollExpirationResult.cs`** in the same folder. Define `sealed record SetPollExpirationResult(Guid Id, DateTimeOffset? ExpiresAt)`. This lightweight result DTO confirms the expiration was set and echoes back the new value. | | |
| TASK-003 | **Create `SetPollExpirationCommandValidator.cs`** in the same folder. Implement `AbstractValidator<SetPollExpirationCommand>` with two rules: (1) `RuleFor(x => x.Token).NotEmpty()` — same pattern as `ClosePollCommandValidator`; (2) `RuleFor(x => x.ExpiresAt).Must(e => e > DateTimeOffset.UtcNow).WithMessage("Expiration date must be in the future.")` — this provides early validation before hitting the domain, matching the pattern in `CreatePollCommandValidator` which validates `ExpiresAt`. | | |
| TASK-004 | **Create `SetPollExpirationCommandHandler.cs`** in the same folder. Implement `IRequestHandler<SetPollExpirationCommand, SetPollExpirationResult>` with a primary constructor injecting `IPollRepository`. In `Handle`: (1) call `pollRepository.GetByManagementTokenAsync(request.Token, cancellationToken)`; (2) if null, throw `PollNotFoundException(request.Token)` — the middleware maps this to 404; (3) call `poll.SetExpiration(request.ExpiresAt)` — the domain method validates the poll is not closed and the date is in the future, throwing `DomainException` if either check fails (middleware maps to 400); (4) call `pollRepository.UpdateAsync(poll, cancellationToken)` to persist the change; (5) return `new SetPollExpirationResult(poll.Id, poll.ExpiresAt)`. | | |
| TASK-005 | **Delete the `.gitkeep` file** from `backend/src/MiniPolls.Application/Polls/SetPollExpiration/` since the folder now contains real files. | | |

### Phase 2 — API Layer: Controller Endpoint and Request Model

- GOAL-002: Expose the `PUT /api/polls/{token}/expiration` endpoint.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | **Add `SetPollExpirationRequest` record** to `PollsController.cs` (alongside existing `CreatePollRequest` and `CastVoteRequest` at the top of the file). Define `public sealed record SetPollExpirationRequest(DateTimeOffset ExpiresAt)`. This is the request body containing the new expiration date. | | |
| TASK-007 | **Add `SetPollExpiration` action** to `PollsController` in `backend/src/MiniPolls.Api/Controllers/PollsController.cs`. Add a new method: `[HttpPut("{token}/expiration")] public async Task<IActionResult> SetPollExpiration(string token, [FromBody] SetPollExpirationRequest request, CancellationToken cancellationToken)`. Inside, send `new SetPollExpirationCommand(token, request.ExpiresAt)` via `mediator.Send`. Return `Ok(result)`. The `PollNotFoundException` thrown by the handler will be caught by `ExceptionHandlingMiddleware` and mapped to 404. The `DomainException` from `Poll.SetExpiration()` (closed poll or past date) will be caught and mapped to 400. Add a `using` for `MiniPolls.Application.Polls.SetPollExpiration` at the top of the file. | | |

### Phase 3 — Application Unit Tests: Handler

- GOAL-003: Unit-test the `SetPollExpirationCommandHandler` with mocked repository.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-008 | **Create folder** `backend/tests/MiniPolls.Application.Tests/Polls/SetPollExpiration/`. | | |
| TASK-009 | **Create `SetPollExpirationCommandHandlerTests.cs`** in that folder. Create a `sealed` test class with a mocked `IPollRepository` (via NSubstitute) and a `SetPollExpirationCommandHandler` instance, following the pattern in `ClosePollCommandHandlerTests`. | | |
| TASK-010 | **Test: `Handle_ValidToken_ActivePoll_SetsExpirationAndReturnsResult`** — Arrange: create a `Poll` via `Poll.Create(...)` without expiration, mock `GetByManagementTokenAsync` to return the poll, pick a future date (e.g., `DateTimeOffset.UtcNow.AddHours(2)`). Act: call `Handle` with the matching token and future date. Assert: (a) result is not null; (b) `result.ExpiresAt` is close to the future date; (c) `result.Id` matches `poll.Id`; (d) `pollRepository.UpdateAsync` was called once with the poll. | | |
| TASK-011 | **Test: `Handle_ValidToken_ActivePoll_UpdatesExistingExpiration`** — Arrange: create a `Poll` with an initial future expiration (e.g., +1 hour), mock repo. Act: call `Handle` with a different future date (e.g., +3 hours). Assert: (a) `result.ExpiresAt` is close to the new date; (b) the new value differs from the original; (c) `pollRepository.UpdateAsync` was called once. This verifies updating (not just initial setting) works. | | |
| TASK-012 | **Test: `Handle_InvalidToken_ThrowsPollNotFoundException`** — Arrange: mock `GetByManagementTokenAsync` returns null. Act/Assert: calling `Handle` throws `PollNotFoundException`. | | |
| TASK-013 | **Test: `Handle_ClosedPoll_ThrowsDomainException`** — Arrange: create a `Poll`, call `poll.Close()` to close it, mock repo. Act/Assert: calling `Handle` with a future date throws `DomainException` with message containing "closed". This verifies the domain rule is enforced. | | |
| TASK-014 | **Test: `Handle_PastDate_ThrowsDomainException`** — Arrange: create a `Poll`, mock repo. Act/Assert: calling `Handle` with a past date (e.g., `DateTimeOffset.UtcNow.AddMinutes(-1)`) throws `DomainException` with message containing "future". This verifies the domain rule is enforced through the handler. | | |
| TASK-015 | **Test: `Handle_ValidToken_CallsUpdateAsyncExactlyOnce`** — Arrange: create a `Poll`, mock repo, pick a future date. Act: call `Handle`. Assert: `pollRepository.UpdateAsync` received exactly 1 call with the poll instance and any `CancellationToken`. Verifies the handler persists the state change. | | |

### Phase 4 — Application Unit Tests: Validator

- GOAL-004: Unit-test the `SetPollExpirationCommandValidator`.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-016 | **Create `SetPollExpirationCommandValidatorTests.cs`** in `backend/tests/MiniPolls.Application.Tests/Polls/SetPollExpiration/`. | | |
| TASK-017 | **Test: `Validate_NonEmptyToken_FutureDate_IsValid`** — Create a `SetPollExpirationCommand("some-token", DateTimeOffset.UtcNow.AddHours(1))`, validate it, assert result is valid. | | |
| TASK-018 | **Test: `Validate_EmptyToken_IsInvalid`** — Create a `SetPollExpirationCommand("", DateTimeOffset.UtcNow.AddHours(1))`, validate it, assert result is invalid with an error on the `Token` property. | | |
| TASK-019 | **Test: `Validate_PastDate_IsInvalid`** — Create a `SetPollExpirationCommand("some-token", DateTimeOffset.UtcNow.AddMinutes(-10))`, validate it, assert result is invalid with an error on the `ExpiresAt` property containing "future". | | |

### Phase 5 — API Integration Tests

- GOAL-005: End-to-end test the `PUT /api/polls/{token}/expiration` endpoint.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-020 | **Create `SetPollExpirationEndpointTests.cs`** in `backend/tests/MiniPolls.Api.Tests/Polls/`. Use `IClassFixture<MiniPollsWebApplicationFactory>`, following the patterns established in `ClosePollEndpointTests`. Define inner response records: `CreatePollResponse(Guid Id, string Slug, string ManagementToken, DateTimeOffset CreatedAt, DateTimeOffset? ExpiresAt)`, `SetPollExpirationResponse(Guid Id, DateTimeOffset? ExpiresAt)`, `ManagementOptionResponse(Guid Id, string Text, int SortOrder, int VoteCount, double Percentage)`, `ManagementPollResponse(Guid Id, string Question, string Slug, bool IsClosed, DateTimeOffset? ExpiresAt, DateTimeOffset? ClosedAt, DateTimeOffset CreatedAt, int TotalVotes, IReadOnlyList<ManagementOptionResponse> Options)`, `PollOptionDtoResponse(Guid Id, string Text, int SortOrder)`, `PollDtoResponse(Guid Id, string Question, string Slug, bool IsClosed, DateTimeOffset? ExpiresAt, DateTimeOffset CreatedAt, IReadOnlyList<PollOptionDtoResponse> Options)`, `ResultsResponse(string Question, bool IsClosed, int TotalVotes, IReadOnlyList<ResultsOptionResponse> Options)`, and `ResultsOptionResponse(Guid Id, string Text, int VoteCount, double Percentage)`. | | |
| TASK-021 | **Test: `Put_ValidToken_FutureDate_Returns200AndSetsExpiration`** — Arrange: create a poll via `POST /api/polls` (without expiration). Act: `PUT /api/polls/{managementToken}/expiration` with JSON body `{ "expiresAt": "<future datetime>" }`. Assert: status is `200 OK`; body deserializes to `SetPollExpirationResponse`; `ExpiresAt` is not null and close to the requested date. | | |
| TASK-022 | **Test: `Put_ValidToken_UpdatesExistingExpiration_Returns200`** — Arrange: create a poll with an initial expiration (e.g., +1 hour). Act: `PUT /api/polls/{managementToken}/expiration` with a different future date (e.g., +5 hours). Assert: status is `200 OK`; `ExpiresAt` is close to the new date and differs from the original. Verify via `GET /api/polls/by-token/{token}` that `ManagementPollDto.ExpiresAt` reflects the update. | | |
| TASK-023 | **Test: `Put_InvalidToken_Returns404`** — Act: `PUT /api/polls/nonexistent-token/expiration` with a valid future date body. Assert: status is `404 Not Found`. | | |
| TASK-024 | **Test: `Put_PastDate_Returns400`** — Arrange: create a poll. Act: `PUT /api/polls/{managementToken}/expiration` with a past date. Assert: status is `400 Bad Request`. The `ValidationBehaviour` pipeline catches this before the handler runs. | | |
| TASK-025 | **Test: `Put_ClosedPoll_Returns400`** — Arrange: create a poll, close it via `POST /api/polls/{token}/close`. Act: `PUT /api/polls/{managementToken}/expiration` with a future date. Assert: status is `400 Bad Request` with detail containing "closed". The domain method throws `DomainException` which the middleware maps to 400. | | |
| TASK-026 | **Test: `Put_ManagementPageReflectsNewExpiration`** — Arrange: create a poll without expiration. Act: set expiration via `PUT /api/polls/{token}/expiration`, then fetch `GET /api/polls/by-token/{token}`. Assert: `ManagementPollDto.ExpiresAt` matches the value that was set. This verifies the key acceptance criterion "the creator can set or update the expiration date/time for an active poll." | | |
| TASK-027 | **Test: `Put_PublicPollPageReflectsExpiration`** — Arrange: create a poll without expiration, set expiration via the management endpoint. Act: `GET /api/polls/by-slug/{slug}`. Assert: `PollDto.ExpiresAt` is not null and matches the set value. This verifies voters can see when the poll expires. | | |

## 3. Alternatives

- **ALT-001: Use `PATCH` instead of `PUT` for setting expiration** — `PATCH` is typically for partial updates, `PUT` for full replacement. Since the endpoint updates a single field (`ExpiresAt`), either could work. Chose `PUT` because the backend instructions §6.1 explicitly define the route as `PUT /api/polls/{token}/expiration`.
- **ALT-002: Return the full `ManagementPollDto` from the set-expiration endpoint** — Would give the frontend all poll data in one shot after updating. Rejected because it couples the set-expiration action to the management query logic and the frontend can simply re-fetch management data if needed. A minimal `SetPollExpirationResult` keeps the command response lean, consistent with `ClosePollResult`.
- **ALT-003: Allow clearing the expiration by sending a null `ExpiresAt`** — The PRD says "the creator can set or update the expiration date/time" but does not mention clearing it. The domain method `Poll.SetExpiration` requires a non-null `DateTimeOffset`. Keeping the current behavior (expiration can only be set or updated to a future date, not removed) is simpler and consistent with the PRD. If clearing is needed later, a separate `ClearPollExpiration` command can be added.
- **ALT-004: Validate `ExpiresAt` only in the validator, not in the domain** — Rejected because domain invariants must be self-enforcing per backend instructions §3.2. The validator provides early feedback (before hitting the database), but the domain method is the authoritative guard.

## 4. Dependencies

- **DEP-001**: No new NuGet packages required. MediatR, FluentValidation, FluentAssertions, NSubstitute, and `Microsoft.AspNetCore.Mvc.Testing` are already referenced in the relevant projects.
- **DEP-002**: `IPollRepository.GetByManagementTokenAsync` and `IPollRepository.UpdateAsync` are already declared and implemented. No infrastructure changes needed.
- **DEP-003**: `Poll.SetExpiration(DateTimeOffset)` domain method is already implemented and tested in `PollTests.cs` (three tests: future date, past date, closed poll). No domain changes needed.
- **DEP-004**: `ExceptionHandlingMiddleware` already catches `PollNotFoundException` → 404 and `DomainException` → 400. No middleware changes needed.
- **DEP-005**: `ManagementPollDto` already includes `ExpiresAt`. `PollDto` already includes `ExpiresAt`. No DTO changes needed in existing queries.

## 5. Files

- **FILE-001**: `backend/src/MiniPolls.Application/Polls/SetPollExpiration/SetPollExpirationCommand.cs` — New file. MediatR command record with `Token` and `ExpiresAt` properties.
- **FILE-002**: `backend/src/MiniPolls.Application/Polls/SetPollExpiration/SetPollExpirationResult.cs` — New file. Result DTO record with `Id` and `ExpiresAt`.
- **FILE-003**: `backend/src/MiniPolls.Application/Polls/SetPollExpiration/SetPollExpirationCommandValidator.cs` — New file. FluentValidation validator checking non-empty token and future expiration date.
- **FILE-004**: `backend/src/MiniPolls.Application/Polls/SetPollExpiration/SetPollExpirationCommandHandler.cs` — New file. Handler that fetches poll by token, calls `SetExpiration()`, persists, and returns result.
- **FILE-005**: `backend/src/MiniPolls.Api/Controllers/PollsController.cs` — Modified. Add `SetPollExpirationRequest` record and `SetPollExpiration` action method with `using` import.
- **FILE-006**: `backend/src/MiniPolls.Application/Polls/SetPollExpiration/.gitkeep` — Deleted. No longer needed.
- **FILE-007**: `backend/tests/MiniPolls.Application.Tests/Polls/SetPollExpiration/SetPollExpirationCommandHandlerTests.cs` — New file. Six unit tests for the handler.
- **FILE-008**: `backend/tests/MiniPolls.Application.Tests/Polls/SetPollExpiration/SetPollExpirationCommandValidatorTests.cs` — New file. Three unit tests for the validator.
- **FILE-009**: `backend/tests/MiniPolls.Api.Tests/Polls/SetPollExpirationEndpointTests.cs` — New file. Seven integration tests for the endpoint.

## 6. Testing

- **TEST-001**: `SetPollExpirationCommandHandlerTests.Handle_ValidToken_ActivePoll_SetsExpirationAndReturnsResult` — verifies expiration is set, result DTO is correct, and `ExpiresAt` matches the requested value.
- **TEST-002**: `SetPollExpirationCommandHandlerTests.Handle_ValidToken_ActivePoll_UpdatesExistingExpiration` — verifies updating an already-set expiration to a new value works.
- **TEST-003**: `SetPollExpirationCommandHandlerTests.Handle_InvalidToken_ThrowsPollNotFoundException` — verifies 404 path.
- **TEST-004**: `SetPollExpirationCommandHandlerTests.Handle_ClosedPoll_ThrowsDomainException` — verifies setting expiration on a closed poll is rejected.
- **TEST-005**: `SetPollExpirationCommandHandlerTests.Handle_PastDate_ThrowsDomainException` — verifies past date is rejected by the domain.
- **TEST-006**: `SetPollExpirationCommandHandlerTests.Handle_ValidToken_CallsUpdateAsyncExactlyOnce` — verifies persistence call.
- **TEST-007**: `SetPollExpirationCommandValidatorTests.Validate_NonEmptyToken_FutureDate_IsValid` — happy-path validation.
- **TEST-008**: `SetPollExpirationCommandValidatorTests.Validate_EmptyToken_IsInvalid` — empty token rejected.
- **TEST-009**: `SetPollExpirationCommandValidatorTests.Validate_PastDate_IsInvalid` — past date rejected.
- **TEST-010**: `SetPollExpirationEndpointTests.Put_ValidToken_FutureDate_Returns200AndSetsExpiration` — end-to-end: create poll, set expiration, verify 200 with correct `ExpiresAt`.
- **TEST-011**: `SetPollExpirationEndpointTests.Put_ValidToken_UpdatesExistingExpiration_Returns200` — end-to-end: create poll with expiration, update it, verify 200 with new value reflected in management endpoint.
- **TEST-012**: `SetPollExpirationEndpointTests.Put_InvalidToken_Returns404` — end-to-end: bogus token returns 404.
- **TEST-013**: `SetPollExpirationEndpointTests.Put_PastDate_Returns400` — end-to-end: past date returns 400 Bad Request.
- **TEST-014**: `SetPollExpirationEndpointTests.Put_ClosedPoll_Returns400` — end-to-end: closed poll returns 400 Bad Request with "closed" in detail.
- **TEST-015**: `SetPollExpirationEndpointTests.Put_ManagementPageReflectsNewExpiration` — end-to-end: set expiration, fetch management endpoint, verify `ExpiresAt` updated.
- **TEST-016**: `SetPollExpirationEndpointTests.Put_PublicPollPageReflectsExpiration` — end-to-end: set expiration, fetch public poll endpoint, verify `ExpiresAt` visible.

## 7. Risks & Assumptions

- **RISK-001**: The `PUT /api/polls/{token}/expiration` route uses the management token as a route parameter. Since `{token}/expiration` has a literal `/expiration` suffix, it will not conflict with `{token}/close`, `{slug}/votes`, `{slug}/results`, or `{slug}/vote-check`. No routing ambiguity.
- **RISK-002**: The FluentValidation rule `Must(e => e > DateTimeOffset.UtcNow)` is evaluated at validation time. There is a tiny race window between validation and domain execution. This is acceptable — the domain method `Poll.SetExpiration()` re-validates the date, providing a second guard. Both throw appropriate errors.
- **ASSUMPTION-001**: Expiration can only be set or updated to a future date, never cleared (set to null). The PRD mentions "set or update" but not "clear". If clearing is needed later, a separate endpoint or command can be added.
- **ASSUMPTION-002**: Setting expiration is only allowed on active (non-closed) polls. The domain method enforces this. This aligns with the PRD which states the feature is for "an active poll."
- **ASSUMPTION-003**: The `200 OK` response with `SetPollExpirationResult` is sufficient for the frontend. The management page can re-fetch full poll data via `GET /api/polls/by-token/{token}` after updating if it needs the complete `ManagementPollDto`.
- **ASSUMPTION-004**: No authorization beyond the management token is required — the token in the URL is the sole access control, consistent with the PRD and backend instructions §11.
- **ASSUMPTION-005**: Automatic expiration (marking poll as closed when `ExpiresAt` passes) is already handled by the `Poll.IsClosed` computed property (`ExpiresAt.HasValue && ExpiresAt.Value <= DateTimeOffset.UtcNow`). No background job or scheduled task is needed — expiration is evaluated at read time.

## 8. Related Specifications / Further Reading

- [PRD — MP-008 User Story](docs/PRD.md) — "Set poll expiration" acceptance criteria (§10.8).
- [Backend Instructions §4.1](../.github/instructions/backend.instructions.md) — Application layer use case folder structure with `SetPollExpiration/` listed.
- [Backend Instructions §6.1](../.github/instructions/backend.instructions.md) — Endpoint table: `PUT /api/polls/{token}/expiration` → `SetPollExpirationCommand`.
- [Backend Instructions §6.3](../.github/instructions/backend.instructions.md) — Response conventions (200 OK, 400 Bad Request, 404 Not Found).
- [MP-007 Backend Plan](docs/tasks/MP-007-Backend.md) — Prior plan that implemented `ClosePoll` command (sister feature sharing similar patterns).
- [MP-001 Backend Plan](docs/tasks/MP-001-Backend.md) — Prior plan that implemented `CreatePoll` with optional `ExpiresAt` during creation.

## Verification

- `dotnet build` from `backend/` — zero errors, zero warnings.
- `dotnet test` from `backend/` — all existing tests still pass, plus the 16 new tests (6 handler + 3 validator + 7 endpoint) pass.
- Manual: create a poll via `POST /api/polls` without expiration, note the `managementToken`. Then `PUT /api/polls/{managementToken}/expiration` with body `{ "expiresAt": "<future datetime>" }` — verify 200 with `ExpiresAt` set. Fetch `GET /api/polls/by-token/{managementToken}` — verify `ExpiresAt` reflects the update. Update again with a different future date — verify 200 with new value. Try with a past date — verify 400 Bad Request. Close the poll via `POST /api/polls/{token}/close`, then try setting expiration — verify 400 Bad Request with "closed" in detail. Try `PUT /api/polls/bogus-token/expiration` — verify 404.
