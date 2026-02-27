---
goal: Implement backend for MP-006 — View results via management link
version: 1.0
date_created: 2026-02-27
status: 'Planned'
tags: feature, backend, management, results
---

# MP-006 Backend — View Results via Management Link

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Implement the `GetPollByManagementToken` use case so that a poll creator can open their secret management link and see the poll question, all options with live vote counts and percentages, and the total number of votes — without needing to have voted themselves. The backend already has the repository method (`IPollRepository.GetByManagementTokenAsync`) and the infrastructure query (`PollRepository.GetByManagementTokenAsync`) wired up with eager-loaded Options and Votes. The gap is the Application-layer query/handler/DTO and the API controller endpoint.

## 1. Requirements & Constraints

- **REQ-001**: `GET /api/polls/by-token/{token}` returns the poll question, all options with vote counts and percentages, total votes, and poll status — matching the endpoint table in backend instructions §6.1.
- **REQ-002**: The response must include poll metadata (id, question, slug, expiresAt, closedAt, createdAt, isClosed) **and** results data (per-option vote count + percentage, total votes) so the frontend management page can render everything from a single API call.
- **REQ-003**: Return `200 OK` for a valid token, `404 Not Found` for an unknown token — per backend instructions §6.3.
- **REQ-004**: The endpoint is accessible regardless of whether the creator has voted (no IP check).
- **REQ-005**: Results reflect the current state at the time of the request; refreshing the page should show updated numbers.
- **CON-001**: The Application layer must not return domain entities across its boundary — return a result DTO (backend instructions §4.2).
- **CON-002**: The handler must depend only on `IPollRepository` (declared in Application/Interfaces), not on EF Core or infrastructure types.
- **PAT-001**: Follow the established query pattern: dedicated folder under `Application/Polls/GetPollByManagementToken/` with `*Query.cs`, `*QueryHandler.cs`, and `*Dto.cs` — mirroring `GetPollBySlug` and `GetResults`.
- **PAT-002**: Controller stays thin — map HTTP concerns to MediatR, return appropriate status codes.
- **PAT-003**: Tests follow `MethodUnderTest_Scenario_ExpectedResult` naming, use NSubstitute for Application tests, and `MiniPollsWebApplicationFactory` for API integration tests.
- **GUD-001**: Use file-scoped namespaces, `sealed` classes, `record` for DTOs, primary constructors where appropriate.

## 2. Implementation Steps

### Phase 1 — Application Layer: Query, Handler, and DTO

- GOAL-001: Create the `GetPollByManagementToken` use case in the Application layer.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | **Create `ManagementPollDto.cs`** in `backend/src/MiniPolls.Application/Polls/GetPollByManagementToken/`. Define two records: (a) `ManagementOptionDto` with properties `Guid Id`, `string Text`, `int SortOrder`, `int VoteCount`, `double Percentage`; (b) `ManagementPollDto` with properties `Guid Id`, `string Question`, `string Slug`, `bool IsClosed`, `DateTimeOffset? ExpiresAt`, `DateTimeOffset? ClosedAt`, `DateTimeOffset CreatedAt`, `int TotalVotes`, `IReadOnlyList<ManagementOptionDto> Options`. This combines poll metadata (like `PollDto`) with results data (like `PollResultsDto`) into a single DTO purpose-built for the management page. | ✅ | 2026-02-27 |
| TASK-002 | **Create `GetPollByManagementTokenQuery.cs`** in the same folder. Define `sealed record GetPollByManagementTokenQuery(string Token) : IRequest<ManagementPollDto?>`. The nullable return type signals that a `null` means "not found", consistent with `GetPollBySlugQuery`. | ✅ | 2026-02-27 |
| TASK-003 | **Create `GetPollByManagementTokenQueryHandler.cs`** in the same folder. Implement `IRequestHandler<GetPollByManagementTokenQuery, ManagementPollDto?>` with a primary constructor injecting `IPollRepository`. In `Handle`: call `pollRepository.GetByManagementTokenAsync(request.Token, cancellationToken)`; if null, return null; otherwise compute `totalVotes` as `poll.Options.Sum(o => o.Votes.Count)`, map options ordered by `SortOrder` to `ManagementOptionDto` (computing percentage as `voteCount / totalVotes * 100` when `totalVotes > 0`, else `0`), and return a `ManagementPollDto` populated with all poll properties and the mapped options. The percentage calculation mirrors the existing logic in `GetResultsQueryHandler`. | ✅ | 2026-02-27 |
| TASK-004 | **Delete the `.gitkeep` file** from `backend/src/MiniPolls.Application/Polls/GetPollByManagementToken/` since the folder now contains real files. | ✅ | 2026-02-27 |

### Phase 2 — API Layer: Controller Endpoint

- GOAL-002: Expose the `GET /api/polls/by-token/{token}` endpoint.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | **Add `GetPollByManagementToken` action** to `PollsController` in `backend/src/MiniPolls.Api/Controllers/PollsController.cs`. Add a new method: `[HttpGet("by-token/{token}")]` `public async Task<IActionResult> GetPollByManagementToken(string token, CancellationToken cancellationToken)`. Inside, send `new GetPollByManagementTokenQuery(token)` via `mediator.Send`. If result is null, return `NotFound()`; otherwise return `Ok(result)`. Add a `using` for `MiniPolls.Application.Polls.GetPollByManagementToken` at the top of the file. This follows the identical pattern used by `GetPollBySlug`. | ✅ | 2026-02-27 |

### Phase 3 — Application Tests

- GOAL-003: Unit-test the `GetPollByManagementTokenQueryHandler` with mocked repository.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | **Create folder** `backend/tests/MiniPolls.Application.Tests/Polls/GetPollByManagementToken/`. | ✅ | 2026-02-27 |
| TASK-007 | **Create `GetPollByManagementTokenQueryHandlerTests.cs`** in that folder. Create a `sealed` test class with a mocked `IPollRepository` (via `NSubstitute`) and a `GetPollByManagementTokenQueryHandler` instance, following the pattern in `GetPollBySlugQueryHandlerTests`. Add the following test methods: | ✅ | 2026-02-27 |
| TASK-008 | Test: `Handle_ValidToken_ReturnsManagementPollDtoWithMetadataAndResults` — Arrange: create a `Poll` via `Poll.Create(...)`, add votes to some options using the reflection helper pattern from `GetResultsQueryHandlerTests` (accessing `_votes` field on `PollOption`), mock `GetByManagementTokenAsync` to return the poll. Act: call `Handle`. Assert: result is not null; `Id`, `Question`, `Slug`, `IsClosed`, `ExpiresAt`, `ClosedAt`, `CreatedAt` match the poll; `TotalVotes` equals the expected count; each option's `VoteCount` and `Percentage` are correct; options are ordered by `SortOrder`. | ✅ | 2026-02-27 |
| TASK-009 | Test: `Handle_ValidToken_PollWithNoVotes_ReturnsZeroCounts` — Arrange: create a `Poll` with no votes, mock repo. Act: call `Handle`. Assert: `TotalVotes` is 0; all options have `VoteCount` 0 and `Percentage` 0. | ✅ | 2026-02-27 |
| TASK-010 | Test: `Handle_InvalidToken_ReturnsNull` — Arrange: mock `GetByManagementTokenAsync` returns null. Act: call `Handle`. Assert: result is null. | ✅ | 2026-02-27 |
| TASK-011 | Test: `Handle_ClosedPoll_ReturnsIsClosedTrue` — Arrange: create a `Poll`, call `poll.Close()`, mock repo. Act: call `Handle`. Assert: `result.IsClosed` is true and `result.ClosedAt` is not null. | ✅ | 2026-02-27 |

### Phase 4 — API Integration Tests

- GOAL-004: End-to-end test the `GET /api/polls/by-token/{token}` endpoint.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-012 | **Create `GetPollByManagementTokenEndpointTests.cs`** in `backend/tests/MiniPolls.Api.Tests/Polls/`. Use `IClassFixture<MiniPollsWebApplicationFactory>`, following the patterns established in `GetPollBySlugEndpointTests` and `GetResultsEndpointTests`. Define inner response records: `CreatePollResponse(Guid Id, string Slug, string ManagementToken)`, `ManagementOptionResponse(Guid Id, string Text, int SortOrder, int VoteCount, double Percentage)`, `ManagementPollResponse(Guid Id, string Question, string Slug, bool IsClosed, DateTimeOffset? ExpiresAt, DateTimeOffset? ClosedAt, DateTimeOffset CreatedAt, int TotalVotes, List<ManagementOptionResponse> Options)`. | ✅ | 2026-02-27 |
| TASK-013 | Test: `Get_ValidToken_Returns200WithPollAndResults` — Arrange: create a poll via `POST /api/polls`, extract `ManagementToken` from the response. Act: `GET /api/polls/by-token/{managementToken}`. Assert: status is `200 OK`; body deserializes to `ManagementPollResponse`; `Question`, `Slug`, `IsClosed`, `TotalVotes` (0 initially) are correct; `Options` has the expected count. | ✅ | 2026-02-27 |
| TASK-014 | Test: `Get_ValidTokenWithVotes_ReturnsUpdatedResults` — Arrange: create a poll, retrieve option IDs via `GET /api/polls/by-slug/{slug}`, cast a vote via `POST /api/polls/{slug}/votes`. Act: `GET /api/polls/by-token/{managementToken}`. Assert: `TotalVotes` is 1; the voted-for option has `VoteCount` 1 and `Percentage` 100; the other option(s) have `VoteCount` 0. This verifies "results update when the page is refreshed." | ✅ | 2026-02-27 |
| TASK-015 | Test: `Get_InvalidToken_Returns404` — Act: `GET /api/polls/by-token/nonexistent-token`. Assert: status is `404 Not Found`. | ✅ | 2026-02-27 |
| TASK-016 | Test: `Get_ValidToken_AccessibleWithoutVoting` — Arrange: create a poll (do NOT cast any votes or interact as a voter). Act: `GET /api/polls/by-token/{managementToken}`. Assert: status is `200 OK` and response contains valid poll data. This directly verifies acceptance criterion 3 ("accessible regardless of whether the creator has voted"). | ✅ | 2026-02-27 |

## 3. Alternatives

- **ALT-001: Reuse `PollResultsDto` from `GetResults` query** — The existing `PollResultsDto` contains question, isClosed, totalVotes, and options with vote counts. However, it lacks poll metadata needed by the management page (id, slug, expiresAt, closedAt, createdAt). Adding those fields to `PollResultsDto` would change its contract and affect the public voting results endpoint. Creating a dedicated `ManagementPollDto` avoids coupling.
- **ALT-002: Return `PollDto` + `PollResultsDto` separately and require two API calls** — The frontend would call `GET /api/polls/by-token/{token}` for metadata and `GET /api/polls/{slug}/results` for results. Rejected because it doubles the network round-trips and the management page should load in a single call for simplicity.
- **ALT-003: Add vote counts directly to the existing `PollDto`** — Would make the public `GetPollBySlug` endpoint return vote data too, which is not desired (voters should only see results after voting via the results endpoint). Keeping DTOs separate preserves the intended access patterns.

## 4. Dependencies

- **DEP-001**: No new NuGet packages required. MediatR, FluentAssertions, NSubstitute, and `Microsoft.AspNetCore.Mvc.Testing` are already referenced in the relevant projects.
- **DEP-002**: `IPollRepository.GetByManagementTokenAsync` is already declared in `backend/src/MiniPolls.Application/Interfaces/IPollRepository.cs` and implemented in `backend/src/MiniPolls.Infrastructure/Persistence/Repositories/PollRepository.cs` with eager loading of `Options` → `Votes`. No infrastructure changes needed.

## 5. Files

- **FILE-001**: `backend/src/MiniPolls.Application/Polls/GetPollByManagementToken/ManagementPollDto.cs` — New file. `ManagementPollDto` and `ManagementOptionDto` records.
- **FILE-002**: `backend/src/MiniPolls.Application/Polls/GetPollByManagementToken/GetPollByManagementTokenQuery.cs` — New file. MediatR query record.
- **FILE-003**: `backend/src/MiniPolls.Application/Polls/GetPollByManagementToken/GetPollByManagementTokenQueryHandler.cs` — New file. Handler that fetches poll by token and maps to DTO with vote counts.
- **FILE-004**: `backend/src/MiniPolls.Api/Controllers/PollsController.cs` — Modified. Add `GetPollByManagementToken` action method and `using` import.
- **FILE-005**: `backend/tests/MiniPolls.Application.Tests/Polls/GetPollByManagementToken/GetPollByManagementTokenQueryHandlerTests.cs` — New file. Four unit tests for the handler.
- **FILE-006**: `backend/tests/MiniPolls.Api.Tests/Polls/GetPollByManagementTokenEndpointTests.cs` — New file. Four integration tests for the endpoint.
- **FILE-007**: `backend/src/MiniPolls.Application/Polls/GetPollByManagementToken/.gitkeep` — Deleted. No longer needed.

## 6. Testing

- **TEST-001**: `GetPollByManagementTokenQueryHandlerTests.Handle_ValidToken_ReturnsManagementPollDtoWithMetadataAndResults` — verifies full DTO mapping with vote counts and percentages from a poll with votes.
- **TEST-002**: `GetPollByManagementTokenQueryHandlerTests.Handle_ValidToken_PollWithNoVotes_ReturnsZeroCounts` — verifies zero-vote edge case returns 0 counts and 0 percentages.
- **TEST-003**: `GetPollByManagementTokenQueryHandlerTests.Handle_InvalidToken_ReturnsNull` — verifies null return for unknown token.
- **TEST-004**: `GetPollByManagementTokenQueryHandlerTests.Handle_ClosedPoll_ReturnsIsClosedTrue` — verifies closed poll metadata is correctly reflected in the DTO.
- **TEST-005**: `GetPollByManagementTokenEndpointTests.Get_ValidToken_Returns200WithPollAndResults` — end-to-end: create poll, hit management endpoint, verify 200 with full response shape.
- **TEST-006**: `GetPollByManagementTokenEndpointTests.Get_ValidTokenWithVotes_ReturnsUpdatedResults` — end-to-end: create poll, cast vote, hit management endpoint, verify vote counts are reflected.
- **TEST-007**: `GetPollByManagementTokenEndpointTests.Get_InvalidToken_Returns404` — end-to-end: hit endpoint with bogus token, verify 404.
- **TEST-008**: `GetPollByManagementTokenEndpointTests.Get_ValidToken_AccessibleWithoutVoting` — end-to-end: create poll, hit management endpoint without voting, verify 200. Directly covers acceptance criterion "accessible regardless of whether the creator has voted."

## 7. Risks & Assumptions

- **RISK-001**: The `ManagementPollDto` includes the `Slug` field, which means anyone with the management token can derive the public voting slug. This is acceptable because the management link is already considered secret and gives full control over the poll per the PRD (§5.3).
- **ASSUMPTION-001**: The management endpoint does not need pagination for options or votes. Polls are expected to have a small number of options (typically < 20) for this hobby project.
- **ASSUMPTION-002**: No rate limiting or caching is required for the management endpoint. The creator refreshing the page will always get a fresh database read, satisfying the "results update when the page is refreshed" acceptance criterion.
- **ASSUMPTION-003**: The `PollRepository.GetByManagementTokenAsync` already eager-loads `Options` → `Votes`, so no additional infrastructure queries or repository changes are needed.

## 8. Related Specifications / Further Reading

- [PRD — MP-006 User Story](docs/PRD.md) — "View results via management link" acceptance criteria (§10.6).
- [Backend Instructions §4.1](../.github/instructions/backend.instructions.md) — Application layer use case folder structure.
- [Backend Instructions §6.1](../.github/instructions/backend.instructions.md) — Endpoint table showing `GET /api/polls/by-token/{token}` → `GetPollByManagementTokenQuery`.
- [Backend Instructions §6.3](../.github/instructions/backend.instructions.md) — Response conventions (200 OK, 404 Not Found).
- [MP-003 Backend Plan](docs/tasks/MP-003-Backend.md) — Prior plan that implemented `GetResults` query (pattern reference).
- [MP-005 Backend Plan](docs/tasks/MP-005-Backend.md) — Prior plan showing the established plan format and conventions.

## Verification

- `dotnet build` from `backend/` — zero errors, zero warnings.
- `dotnet test` from `backend/` — all existing tests still pass, plus the 8 new tests (4 Application, 4 API) pass.
- Manual: create a poll via `POST /api/polls`, note the `managementToken` in the response, then `GET /api/polls/by-token/{managementToken}` — verify 200 with full poll metadata and zero vote counts. Cast a vote via `POST /api/polls/{slug}/votes`, then repeat the management GET — verify vote counts are updated. Try `GET /api/polls/by-token/bogus` — verify 404.
