---
goal: Implement backend for MP-009 — Handle invalid poll links with consistent 404 ProblemDetails responses
version: 1.0
date_created: 2026-02-27
status: 'Planned'
tags: feature, backend, error-handling, 404, not-found
---

# MP-009 Backend — Handle Invalid Poll Links

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Ensure that all API endpoints return a consistent, structured `ProblemDetails` (RFC 7807) response with HTTP 404 when a non-existent poll slug or management token is used. Currently the codebase has an inconsistency: four endpoints (`CastVote`, `CheckVote`, `ClosePoll`, `SetPollExpiration`) throw `PollNotFoundException` which the `ExceptionHandlingMiddleware` maps to a 404 ProblemDetails response, while three query endpoints (`GetPollBySlug`, `GetPollByManagementToken`, `GetResults`) return `null` from the handler and then `NotFound()` from the controller — producing an **empty 404 body** with no message. MP-009 requires a "clear message" (e.g., "Poll not found") for all not-found scenarios, so all seven endpoints must return a structured ProblemDetails body. Additionally, `PollNotFoundException` currently hard-codes the word "slug" in its message even when used for management-token lookups, and one integration test (`CheckVoteEndpointTests`) is missing a 404 test case.

## 1. Requirements & Constraints

- **REQ-001**: `GET /api/polls/by-slug/{slug}` with a non-existent slug must return 404 with a ProblemDetails body containing a clear message such as "Poll not found" — per MP-009 acceptance criterion 1.
- **REQ-002**: `GET /api/polls/by-token/{token}` with an invalid token must return 404 with a ProblemDetails body — per MP-009 acceptance criterion 2.
- **REQ-003**: `GET /api/polls/{slug}/results` with a non-existent slug must return 404 with a ProblemDetails body — implied by MP-009 (any poll-related endpoint with an invalid slug).
- **REQ-004**: `GET /api/polls/{slug}/vote-check` with a non-existent slug must return 404 — already works via `PollNotFoundException`, but needs an integration test.
- **REQ-005**: `POST /api/polls/{slug}/votes`, `POST /api/polls/{token}/close`, and `PUT /api/polls/{token}/expiration` already return ProblemDetails 404 via `PollNotFoundException` — no functional changes needed.
- **REQ-006**: The `PollNotFoundException` error message must be context-appropriate: "Poll with slug 'X' was not found" for slug lookups, and "Poll with the specified management token was not found" (without leaking the token value) for token lookups.
- **CON-001**: Application layer must not return domain entities — existing convention (backend instructions §4.2).
- **CON-002**: Controller stays thin — only map HTTP concerns to MediatR (backend instructions §6.2).
- **PAT-001**: Not-found handling should be uniform: handlers throw `PollNotFoundException`, middleware translates to ProblemDetails 404. This matches the pattern already used by `CastVoteCommandHandler`, `CheckVoteQueryHandler`, `ClosePollCommandHandler`, and `SetPollExpirationCommandHandler`.
- **PAT-002**: Tests follow `MethodUnderTest_Scenario_ExpectedResult` naming, use NSubstitute for Application tests, and `MiniPollsWebApplicationFactory` for API integration tests.
- **GUD-001**: Use file-scoped namespaces, `sealed` classes, `record` for DTOs, primary constructors where appropriate.

## 2. Implementation Steps

### Phase 1 — Refactor `PollNotFoundException` for Context-Appropriate Messages

- GOAL-001: Make `PollNotFoundException` produce distinct messages for slug-based vs. token-based lookups, preventing token values from leaking into error responses.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | **Refactor `PollNotFoundException`** in `backend/src/MiniPolls.Domain/Exceptions/PollNotFoundException.cs`. Replace the current primary constructor `PollNotFoundException(string slug) : DomainException(...)` with a private constructor taking a `string message` and two static factory methods: `ForSlug(string slug)` returning message `"Poll with slug '{slug}' was not found."`, and `ForManagementToken()` returning message `"Poll with the specified management token was not found."` (no token value in message for security). The class remains `sealed`. | | |
| TASK-002 | **Update all existing call sites** of `new PollNotFoundException(...)` to use the new factory methods. There are four call sites: (1) `CastVoteCommandHandler` → `PollNotFoundException.ForSlug(request.Slug)`; (2) `CheckVoteQueryHandler` → `PollNotFoundException.ForSlug(request.Slug)`; (3) `ClosePollCommandHandler` → `PollNotFoundException.ForManagementToken()`; (4) `SetPollExpirationCommandHandler` → `PollNotFoundException.ForManagementToken()`. | | |

### Phase 2 — Standardize Query Handlers to Throw on Not-Found

- GOAL-002: Change the three query handlers that currently return `null` on not-found to throw `PollNotFoundException`, making all endpoints produce consistent ProblemDetails 404 responses via the middleware.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-003 | **Update `GetPollBySlugQuery`** in `backend/src/MiniPolls.Application/Polls/GetPollBySlug/GetPollBySlugQuery.cs`. Change the return type from `IRequest<PollDto?>` to `IRequest<PollDto>` (non-nullable). | | |
| TASK-004 | **Update `GetPollBySlugQueryHandler`** in `backend/src/MiniPolls.Application/Polls/GetPollBySlug/GetPollBySlugQueryHandler.cs`. Change the `IRequestHandler` generic from `<GetPollBySlugQuery, PollDto?>` to `<GetPollBySlugQuery, PollDto>`. Replace the `if (poll is null) return null;` block with `if (poll is null) throw PollNotFoundException.ForSlug(request.Slug);`. Add `using MiniPolls.Domain.Exceptions;`. | | |
| TASK-005 | **Update `GetPollByManagementTokenQuery`** in `backend/src/MiniPolls.Application/Polls/GetPollByManagementToken/GetPollByManagementTokenQuery.cs`. Change the return type from `IRequest<ManagementPollDto?>` to `IRequest<ManagementPollDto>`. | | |
| TASK-006 | **Update `GetPollByManagementTokenQueryHandler`** in `backend/src/MiniPolls.Application/Polls/GetPollByManagementToken/GetPollByManagementTokenQueryHandler.cs`. Change the `IRequestHandler` generic to use non-nullable `ManagementPollDto`. Replace `if (poll is null) return null;` with `if (poll is null) throw PollNotFoundException.ForManagementToken();`. Add `using MiniPolls.Domain.Exceptions;`. | | |
| TASK-007 | **Update `GetResultsQuery`** in `backend/src/MiniPolls.Application/Votes/GetResults/GetResultsQuery.cs`. Change the return type from `IRequest<PollResultsDto?>` to `IRequest<PollResultsDto>`. | | |
| TASK-008 | **Update `GetResultsQueryHandler`** in `backend/src/MiniPolls.Application/Votes/GetResults/GetResultsQueryHandler.cs`. Change the `IRequestHandler` generic to use non-nullable `PollResultsDto`. Replace `if (poll is null) return null;` with `if (poll is null) throw PollNotFoundException.ForSlug(request.Slug);`. Add `using MiniPolls.Domain.Exceptions;`. | | |

### Phase 3 — Simplify Controller Not-Found Handling

- GOAL-003: Remove the manual null-checks and `NotFound()` returns from the controller, since the handlers now throw on not-found and the middleware handles the 404 response.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-009 | **Simplify `GetPollBySlug` action** in `backend/src/MiniPolls.Api/Controllers/PollsController.cs`. Remove the `if (result is null) return NotFound();` check. The handler now throws `PollNotFoundException` if the slug is invalid; the middleware maps it to 404. Simply `return Ok(result)`. | | |
| TASK-010 | **Simplify `GetPollByManagementToken` action** in the same file. Remove the null check; return `Ok(result)` directly. | | |
| TASK-011 | **Simplify `GetResults` action** in the same file. Remove the null check; return `Ok(result)` directly. | | |

### Phase 4 — Update Application-Layer Unit Tests

- GOAL-004: Update the existing unit tests for the three modified handlers to assert `PollNotFoundException` is thrown instead of `null` being returned.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-012 | **Update `GetPollBySlugQueryHandlerTests`** in `backend/tests/MiniPolls.Application.Tests/Polls/GetPollBySlug/GetPollBySlugQueryHandlerTests.cs`. Rename `Handle_NonExistentSlug_ReturnsNull` to `Handle_NonExistentSlug_ThrowsPollNotFoundException`. Change the assertion from `result.Should().BeNull()` to `await act.Should().ThrowAsync<PollNotFoundException>()` (using the `Func<Task>` pattern: `var act = () => _handler.Handle(...)`). Add `using MiniPolls.Domain.Exceptions;`. | | |
| TASK-013 | **Update `GetPollByManagementTokenQueryHandlerTests`** in `backend/tests/MiniPolls.Application.Tests/Polls/GetPollByManagementToken/GetPollByManagementTokenQueryHandlerTests.cs`. Rename `Handle_InvalidToken_ReturnsNull` to `Handle_InvalidToken_ThrowsPollNotFoundException`. Change the assertion to `await act.Should().ThrowAsync<PollNotFoundException>()`. | | |
| TASK-014 | **Update `GetResultsQueryHandlerTests`** in `backend/tests/MiniPolls.Application.Tests/Votes/GetResults/GetResultsQueryHandlerTests.cs`. Rename `Handle_NonExistentSlug_ReturnsNull` to `Handle_NonExistentSlug_ThrowsPollNotFoundException`. Change the assertion to `await act.Should().ThrowAsync<PollNotFoundException>()`. | | |

### Phase 5 — Add Missing Integration Test and Enhance 404 Assertions

- GOAL-005: Add the missing 404 integration test for the `vote-check` endpoint and enhance existing 404 integration tests to verify the ProblemDetails response body structure.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-015 | **Add `Get_NonExistentSlug_Returns404` test** to `backend/tests/MiniPolls.Api.Tests/Polls/CheckVoteEndpointTests.cs`. Act: `GET /api/polls/nonexistent-slug/vote-check`. Assert: status is 404; response body deserializes to a `ProblemDetails`-shaped record with `Status == 404` and `Title` containing "not found" (case-insensitive). Follow the same pattern as `GetPollBySlugEndpointTests.Get_NonExistentSlug_Returns404`. | | |
| TASK-016 | **Enhance `Get_NonExistentSlug_Returns404`** in `backend/tests/MiniPolls.Api.Tests/Polls/GetPollBySlugEndpointTests.cs`. After asserting the status code, also deserialize the body to a `ProblemDetailsResponse` record and assert that `Status` is 404, `Title` is "Poll not found", and `Detail` is not null or empty. Add a private `ProblemDetailsResponse` record to the test class. | | |
| TASK-017 | **Enhance `Get_InvalidToken_Returns404`** in `backend/tests/MiniPolls.Api.Tests/Polls/GetPollByManagementTokenEndpointTests.cs`. Same body assertion pattern as TASK-016: verify ProblemDetails body with `Status == 404` and `Title == "Poll not found"`. | | |
| TASK-018 | **Enhance `Get_NonExistentSlug_Returns404`** in `backend/tests/MiniPolls.Api.Tests/Polls/GetResultsEndpointTests.cs`. Same body assertion pattern. | | |
| TASK-019 | **Enhance `Post_NonExistentSlug_Returns404`** in `backend/tests/MiniPolls.Api.Tests/Polls/CastVoteEndpointTests.cs`. Same body assertion pattern. | | |
| TASK-020 | **Enhance `Post_InvalidToken_Returns404`** in `backend/tests/MiniPolls.Api.Tests/Polls/ClosePollEndpointTests.cs`. Same body assertion pattern. | | |
| TASK-021 | **Enhance `Put_InvalidToken_Returns404`** in `backend/tests/MiniPolls.Api.Tests/Polls/SetPollExpirationEndpointTests.cs`. Same body assertion pattern. | | |

## 3. Alternatives

- **ALT-001: Keep handlers returning `null` and return `NotFound(problemDetails)` from the controller** — Would achieve a ProblemDetails body without changing handlers. Rejected because it splits not-found logic between controller and middleware, creating two different code paths for the same error. Throwing from the handler is the established pattern (4 of 7 endpoints already do it) and keeps controllers thin per backend instructions §6.2.
- **ALT-002: Leave `PollNotFoundException` unchanged (single `slug` parameter)** — Simpler change but produces misleading messages like "Poll with slug 'abc123longtoken' was not found" for management-token lookups, and leaks token values into API responses. Rejected for both clarity and security reasons.
- **ALT-003: Create separate `ManagementTokenNotFoundException` exception** — Would be explicit but adds a second exception class the middleware must handle, and both map to the same 404 ProblemDetails. Rejected as overkill; factory methods on a single exception are cleaner.

## 4. Dependencies

- **DEP-001**: No new NuGet packages required. All existing dependencies (MediatR, FluentValidation, FluentAssertions, NSubstitute, `Microsoft.AspNetCore.Mvc.Testing`) are sufficient.
- **DEP-002**: `ExceptionHandlingMiddleware` already catches `PollNotFoundException` and maps it to 404 ProblemDetails — no middleware changes needed.
- **DEP-003**: `IPollRepository.GetBySlugAsync` and `IPollRepository.GetByManagementTokenAsync` already return `null` for missing entities — no repository changes needed.

## 5. Files

- **FILE-001**: `backend/src/MiniPolls.Domain/Exceptions/PollNotFoundException.cs` — refactor to use static factory methods with context-appropriate messages.
- **FILE-002**: `backend/src/MiniPolls.Application/Polls/GetPollBySlug/GetPollBySlugQuery.cs` — change return type to non-nullable.
- **FILE-003**: `backend/src/MiniPolls.Application/Polls/GetPollBySlug/GetPollBySlugQueryHandler.cs` — throw on not-found instead of returning null.
- **FILE-004**: `backend/src/MiniPolls.Application/Polls/GetPollByManagementToken/GetPollByManagementTokenQuery.cs` — change return type to non-nullable.
- **FILE-005**: `backend/src/MiniPolls.Application/Polls/GetPollByManagementToken/GetPollByManagementTokenQueryHandler.cs` — throw on not-found.
- **FILE-006**: `backend/src/MiniPolls.Application/Votes/GetResults/GetResultsQuery.cs` — change return type to non-nullable.
- **FILE-007**: `backend/src/MiniPolls.Application/Votes/GetResults/GetResultsQueryHandler.cs` — throw on not-found.
- **FILE-008**: `backend/src/MiniPolls.Application/Votes/CastVote/CastVoteCommandHandler.cs` — update `PollNotFoundException` call site to use `ForSlug`.
- **FILE-009**: `backend/src/MiniPolls.Application/Votes/CheckVote/CheckVoteQueryHandler.cs` — update `PollNotFoundException` call site to use `ForSlug`.
- **FILE-010**: `backend/src/MiniPolls.Application/Polls/ClosePoll/ClosePollCommandHandler.cs` — update `PollNotFoundException` call site to use `ForManagementToken`.
- **FILE-011**: `backend/src/MiniPolls.Application/Polls/SetPollExpiration/SetPollExpirationCommandHandler.cs` — update `PollNotFoundException` call site to use `ForManagementToken`.
- **FILE-012**: `backend/src/MiniPolls.Api/Controllers/PollsController.cs` — remove three null-checks / `NotFound()` calls.
- **FILE-013**: `backend/tests/MiniPolls.Application.Tests/Polls/GetPollBySlug/GetPollBySlugQueryHandlerTests.cs` — update not-found test.
- **FILE-014**: `backend/tests/MiniPolls.Application.Tests/Polls/GetPollByManagementToken/GetPollByManagementTokenQueryHandlerTests.cs` — update not-found test.
- **FILE-015**: `backend/tests/MiniPolls.Application.Tests/Votes/GetResults/GetResultsQueryHandlerTests.cs` — update not-found test.
- **FILE-016**: `backend/tests/MiniPolls.Api.Tests/Polls/CheckVoteEndpointTests.cs` — add missing 404 test.
- **FILE-017**: `backend/tests/MiniPolls.Api.Tests/Polls/GetPollBySlugEndpointTests.cs` — enhance 404 test with body assertions.
- **FILE-018**: `backend/tests/MiniPolls.Api.Tests/Polls/GetPollByManagementTokenEndpointTests.cs` — enhance 404 test with body assertions.
- **FILE-019**: `backend/tests/MiniPolls.Api.Tests/Polls/GetResultsEndpointTests.cs` — enhance 404 test with body assertions.
- **FILE-020**: `backend/tests/MiniPolls.Api.Tests/Polls/CastVoteEndpointTests.cs` — enhance 404 test with body assertions.
- **FILE-021**: `backend/tests/MiniPolls.Api.Tests/Polls/ClosePollEndpointTests.cs` — enhance 404 test with body assertions.
- **FILE-022**: `backend/tests/MiniPolls.Api.Tests/Polls/SetPollExpirationEndpointTests.cs` — enhance 404 test with body assertions.

## 6. Testing

- **TEST-001**: `GetPollBySlugQueryHandlerTests.Handle_NonExistentSlug_ThrowsPollNotFoundException` — verify handler throws when repository returns null.
- **TEST-002**: `GetPollByManagementTokenQueryHandlerTests.Handle_InvalidToken_ThrowsPollNotFoundException` — verify handler throws when repository returns null.
- **TEST-003**: `GetResultsQueryHandlerTests.Handle_NonExistentSlug_ThrowsPollNotFoundException` — verify handler throws when repository returns null.
- **TEST-004**: `CheckVoteEndpointTests.Get_NonExistentSlug_Returns404` — new integration test; verify 404 status and ProblemDetails body.
- **TEST-005**: All seven existing 404 integration tests enhanced to assert ProblemDetails body structure (`Status`, `Title`, `Detail` fields).
- **TEST-006**: Run full test suite (`dotnet test` from `backend/`) to verify no regressions from the refactored `PollNotFoundException` factory methods and handler changes.

## 7. Risks & Assumptions

- **RISK-001**: Changing query return types from nullable to non-nullable may cause compile errors in code not yet discovered. Mitigation: run `dotnet build` across the full solution before testing.
- **RISK-002**: The `DuplicateVoteException` catch block in `PollsController.CastVote` calls `mediator.Send(new GetResultsQuery(...))` — changing `GetResultsQuery` return type to non-nullable means the result no longer needs a null-check, but the call to `GetResultsQuery` inside the `catch` could itself throw `PollNotFoundException` (if the poll was deleted between the vote attempt and the results fetch — extremely unlikely but theoretically possible). Mitigation: this edge case is acceptable for a hobby project; the middleware will catch it and return a 404.
- **ASSUMPTION-001**: No other consumers of `GetPollBySlugQuery`, `GetPollByManagementTokenQuery`, or `GetResultsQuery` exist beyond the controller and tests. Verified by searching the codebase.
- **ASSUMPTION-002**: The frontend already handles 404 responses from these endpoints (or will be handled by MP-009-Frontend). The backend change is purely about ensuring a structured ProblemDetails body is returned.

## 8. Related Specifications / Further Reading

- [PRD — MP-009: Handle invalid poll links](../PRD.md)
- [Backend instructions](../../.github/instructions/backend.instructions.md) — §6.3 Response Conventions (404 Not Found for unknown slugs or tokens)
- [RFC 7807 — Problem Details for HTTP APIs](https://tools.ietf.org/html/rfc7807)
