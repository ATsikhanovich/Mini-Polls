---
goal: Implement frontend for MP-007 — Close a poll manually
version: 1.0
date_created: 2026-02-27
date_completed: 2026-02-27
status: 'Completed'
tags: feature, frontend, management, close-poll
---

# MP-007 Frontend — Close a Poll Manually

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

Add a "Close Poll" button to the `ManagePage` so the poll creator can manually close their poll, preventing further votes. The backend `POST /api/polls/{token}/close` endpoint is planned in [MP-007-Backend.md](MP-007-Backend.md). On the frontend, this requires: a new `closePoll` API function, a new `ClosePollResponse` type, a confirmation prompt before closing, calling the API, and refreshing the displayed data to reflect the "Closed" status. The `VotePage` and `ResultsPage` already handle closed polls (redirect to results / show "Poll closed" badge), so no changes are needed there. The `ManagePage` already renders a `StatusBadge` and conditionally displays management actions for active polls, so the close button integrates naturally.

## 1. Requirements & Constraints

- **REQ-001**: The management page shows a "Close poll" button for active polls — per MP-007 acceptance criteria.
- **REQ-002**: Clicking "Close poll" marks the poll as closed and disables further voting — the API call is `POST /api/polls/{token}/close`.
- **REQ-003**: After closing, the management page shows the poll status as "Closed" — the `StatusBadge` already handles this; the page just needs to update its `data` state.
- **REQ-004**: Voters visiting the poll after closure see the final results and a "Poll closed" notice — already handled by `VotePage` (redirects to results when `isClosed`) and `ResultsPage` (shows `StatusBadge` when closed).
- **REQ-005**: A confirmation prompt must be shown before closing to prevent accidental closure — per frontend instructions §5.5 which specifies "a 'Close Poll' button with a confirmation prompt."
- **REQ-006**: The "Close Poll" button should not appear for already-closed or expired polls — only active polls show management actions.
- **CON-001**: No new dependencies. Use only existing libraries.
- **CON-002**: API functions are pure HTTP helpers — no React state inside `api/polls.ts`.
- **CON-003**: Local `useState` for close action state (loading, error) — no Zustand store needed.
- **PAT-001**: Follow API function pattern from `castVote` — POST with no body (token is in the URL).
- **PAT-002**: Follow API test pattern from `polls.test.ts` — mock fetch, verify URL/method, test success and error cases.
- **PAT-003**: Follow page test pattern from `ManagePage.test.tsx` — mock API module, use RTL `findByRole`, simulate user interactions with `userEvent` or `fireEvent`.
- **PAT-004**: Follow E2E test pattern from `manage.spec.ts` — mock API via `page.route()`, use ARIA selectors.
- **GUD-001**: Keep `ManagePage` under ~150 lines. If adding the close button pushes it over, the close-poll section can be a small inline block rather than a separate component, unless it becomes unwieldy.

## 2. Implementation Steps

### Phase 1 — TypeScript Types

- GOAL-001: Define the `ClosePollResponse` type matching the backend `ClosePollResult` response shape.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | **Add `ClosePollResponse` interface** to `frontend/src/types/poll.ts`. Properties: `id: string`, `isClosed: boolean`, `closedAt: string | null` (ISO 8601). This mirrors the backend `ClosePollResult` DTO. Export the interface. | | |

### Phase 2 — API Function

- GOAL-002: Add the `closePoll` function to the API client.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-002 | **Add `closePoll` function** to `frontend/src/api/polls.ts`. Signature: `export function closePoll(token: string): Promise<ClosePollResponse>`. Implementation: call `request<ClosePollResponse>(`/polls/${token}/close`, { method: 'POST' })`. No request body is needed — the token in the URL is sufficient. Import `ClosePollResponse` from `../types/poll`. This follows the pattern of `castVote` (POST, no complex body). | | |

### Phase 3 — ManagePage Modifications

- GOAL-003: Add a "Close Poll" button with confirmation prompt and state refresh to the management page.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-003 | **Add new state variables** to `ManagePage` for the close action: `closing: boolean` (tracks in-flight close request, initialized to `false`), `closeError: string | null` (holds error message if close fails). These use local `useState`, not Zustand. | | |
| TASK-004 | **Add `handleClosePoll` async function** inside `ManagePage`. Logic: (1) show a `window.confirm('Are you sure you want to close this poll? This action cannot be undone.')` prompt — if the user cancels, return early; (2) set `closing` to `true` and `closeError` to `null`; (3) call `closePoll(token!)` from the API module; (4) on success, re-fetch the full poll data by calling `getPollByManagementToken(token!)` and update the `data` state — this ensures the page reflects the new `isClosed`, `closedAt`, and status badge without a manual refresh; (5) on error, set `closeError` to `'Failed to close the poll. Please try again.'`; (6) set `closing` to `false` in a `finally` block. Import `closePoll` from `../api/polls`. | | |
| TASK-005 | **Render the "Close Poll" action section** in the JSX, placed below the voting link card and only when the poll is active (`status === 'active'`). Render a bordered card (consistent with the voting link card styling: `border border-white/10 rounded-lg p-4 mt-4`) containing: (a) a section label `<p>` reading "Actions" with `text-sm font-semibold text-white/60 uppercase tracking-wider mb-3` styling; (b) a `<button>` with text "Close Poll" (or "Closing…" when `closing` is true), styled with a destructive appearance (`bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-[var(--radius-btn)] transition disabled:opacity-60 disabled:cursor-not-allowed`), `disabled` when `closing` is true, `onClick` calling `handleClosePoll`; (c) an `<ErrorMessage message={closeError} />` below the button to show any close-action errors. | | |
| TASK-006 | **Import `closePoll`** from `../api/polls` at the top of `ManagePage.tsx`, alongside the existing `getPollByManagementToken` and `ApiError` imports. | | |

### Phase 4 — API Unit Tests

- GOAL-004: Add unit tests for `closePoll` in the existing API test file.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-007 | **Add `closePoll` to imports** at the top of `frontend/tests/api/polls.test.ts`. | | |
| TASK-008 | **Add `describe('closePoll', ...)` block** to `frontend/tests/api/polls.test.ts`. Define a `closePollPayload` fixture: `{ id: 'poll-1', isClosed: true, closedAt: '2026-02-27T12:00:00Z' }`. | | |
| TASK-009 | Test: **`sends POST to /polls/{token}/close with no body`** — mock fetch with 200 and the fixture, call `closePoll('my-token')`, assert URL ends with `/polls/my-token/close`, method is POST, and `Content-Type: application/json` header is present. Assert `body` is `undefined` (no request body). | | |
| TASK-010 | Test: **`returns parsed ClosePollResponse on 200`** — mock fetch with 200 and fixture, call function, assert result deep-equals the fixture. | | |
| TASK-011 | Test: **`throws ApiError with status 404 when token not found`** — mock fetch with 404, assert rejects with `{ status: 404 }`. | | |
| TASK-012 | Test: **`throws on network failure`** — mock fetch rejecting with `TypeError('Failed to fetch')`, assert rejects with `TypeError`. | | |

### Phase 5 — Page Component Tests (Vitest + RTL)

- GOAL-005: Add tests for the new close-poll functionality in `ManagePage.test.tsx`.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-013 | **Add `closePoll` to the mock** in `frontend/tests/pages/ManagePage.test.tsx`. Update the `vi.mock('../../src/api/polls', ...)` block to also mock `closePoll: vi.fn()`. Import the mocked `closePoll` function. | | |
| TASK-014 | Test: **`shows "Close Poll" button for active poll`** — resolve `getPollByManagementToken` with the active poll fixture (`isClosed: false`), render, assert a button with accessible name "Close Poll" is visible. | | |
| TASK-015 | Test: **`does not show "Close Poll" button for closed poll`** — resolve with `isClosed: true, closedAt: '...'`, render, assert no button with name "Close Poll" exists. | | |
| TASK-016 | Test: **`does not show "Close Poll" button for expired poll`** — resolve with `isClosed: true, expiresAt: '2026-01-01T00:00:00Z'` (past date), render, assert no "Close Poll" button. | | |
| TASK-017 | Test: **`clicking "Close Poll" shows confirmation prompt`** — resolve with active poll fixture, mock `window.confirm` to return `false` (user cancels), render, click the "Close Poll" button, assert `window.confirm` was called with a message containing "close". Assert `closePoll` was NOT called (user cancelled). | | |
| TASK-018 | Test: **`confirming close calls closePoll and refreshes data`** — resolve `getPollByManagementToken` with active poll fixture initially, mock `window.confirm` to return `true`, mock `closePoll` to resolve with `{ id: 'poll-1', isClosed: true, closedAt: '...' }`, mock the second `getPollByManagementToken` call to resolve with the closed poll fixture. Render, click "Close Poll", await re-render. Assert `closePoll` was called once with the token. Assert the `StatusBadge` now shows "Closed" (data was refreshed). | | |
| TASK-019 | Test: **`shows error message when close fails`** — resolve `getPollByManagementToken` with active poll fixture, mock `window.confirm` to return `true`, mock `closePoll` to reject with a generic error. Render, click "Close Poll", assert an error text matching `/failed to close/i` appears. | | |
| TASK-020 | Test: **`disables button while close is in progress`** — resolve `getPollByManagementToken` with active fixture, mock `window.confirm` to return `true`, mock `closePoll` to return an unresolved promise. Render, click "Close Poll", assert the button is disabled and its text changes to "Closing…". | | |

### Phase 6 — E2E Tests (Playwright)

- GOAL-006: Add Playwright E2E specs for the close-poll interaction on the management page.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-021 | **Add close-poll specs** to the existing `frontend/e2e/manage.spec.ts` file (add within the existing `test.describe('Manage page', ...)` block or add a new `test.describe('Close poll', ...)` nested block). Reuse the existing `defaultManagementPoll` fixture and `mockGetPollByToken` helper. | | |
| TASK-022 | **Define `mockClosePoll` helper** — intercept `**/api/polls/*/close` POST requests via `page.route()` and fulfill with 200 + `{ id: 'poll-1', isClosed: true, closedAt: '2026-02-27T12:00:00Z' }`. After the close succeeds, subsequent calls to `**/api/polls/by-token/*` should return the closed poll fixture (mock with `isClosed: true, closedAt: '...'`). | | |
| TASK-023 | Test: **`shows "Close Poll" button for active poll`** — mock API with active poll, navigate to `/manage/test-token`, assert a "Close Poll" button is visible. | | |
| TASK-024 | Test: **`does not show "Close Poll" button for closed poll`** — mock API with closed poll fixture (`isClosed: true`), navigate, assert "Close Poll" button is not visible. | | |
| TASK-025 | Test: **`closing poll updates status badge to "Closed"`** — mock API with active poll, mock close endpoint, set up `page.on('dialog', d => d.accept())` to auto-confirm the `window.confirm` dialog. Navigate, click "Close Poll", after the close API completes, mock the management token endpoint to return the closed fixture. Assert the status badge changes from "Active" to "Closed". | | |
| TASK-026 | Test: **`cancelling confirmation does not close poll`** — mock API with active poll, set up `page.on('dialog', d => d.dismiss())` to cancel. Navigate, click "Close Poll". Assert the status badge still shows "Active" and the close API was NOT called (can verify by checking there's no POST request to the close endpoint). | | |
| TASK-027 | Test: **`shows error on close failure`** — mock API with active poll, mock close endpoint to return 500 or abort. Set up `page.on('dialog', d => d.accept())`. Navigate, click "Close Poll". Assert error text matching `/failed to close/i` appears. | | |

## 3. Alternatives

- **ALT-001: Use a custom modal/dialog instead of `window.confirm`** — A styled modal would be more visually consistent. Rejected for now because the frontend instructions §5.5 say "a 'Close Poll' button with a confirmation prompt", and `window.confirm` is the simplest implementation with no extra dependencies. Can be upgraded to a custom dialog in a polish pass.
- **ALT-002: Optimistically update the UI before the close API responds** — Set `isClosed: true` in local state immediately, then revert on failure. Rejected because closing is a destructive, irreversible action. It's better to wait for the server to confirm and then refresh, avoiding inconsistent UI states.
- **ALT-003: Navigate to a separate "poll closed" page after closing** — Rejected because the user is already on the management page and should stay there to see the updated status and final results. No navigation needed.
- **ALT-004: Only call `closePoll` and update local state from the response, without re-fetching the full management poll** — The `ClosePollResponse` only has `id`, `isClosed`, and `closedAt`. We'd need to manually patch `data.isClosed`, `data.closedAt`. This works but is fragile — re-fetching ensures all data (including any concurrent vote changes) is fresh. The extra GET is cheap and keeps the code simpler.

## 4. Dependencies

- **DEP-001**: No new npm packages required. All necessary libraries are already installed.
- **DEP-002**: Depends on backend `POST /api/polls/{token}/close` endpoint — see [MP-007-Backend.md](MP-007-Backend.md).
- **DEP-003**: Existing `ManagePage` implementation from MP-006 — the page must already be rendering poll data, status badge, and voting link.
- **DEP-004**: Existing shared components (`StatusBadge`, `ErrorMessage`, `CopyButton`, `ProgressBar`) — no changes needed.
- **DEP-005**: Existing `derivePollStatus` utility — no changes needed.
- **DEP-006**: Existing `request` helper in `api/polls.ts` — no changes needed.

## 5. Files

- **FILE-001**: `frontend/src/types/poll.ts` — Modified. Add `ClosePollResponse` interface.
- **FILE-002**: `frontend/src/api/polls.ts` — Modified. Add `closePoll` function and import `ClosePollResponse`.
- **FILE-003**: `frontend/src/pages/ManagePage.tsx` — Modified. Add close-poll state variables, `handleClosePoll` function, "Close Poll" button with confirmation prompt, and error display. Import `closePoll`.
- **FILE-004**: `frontend/tests/api/polls.test.ts` — Modified. Add `describe('closePoll', ...)` block with 4 tests.
- **FILE-005**: `frontend/tests/pages/ManagePage.test.tsx` — Modified. Add `closePoll` to mock, add 7 new tests for close-poll functionality.
- **FILE-006**: `frontend/e2e/manage.spec.ts` — Modified. Add `mockClosePoll` helper and 5 new E2E tests for the close-poll interaction.

## 6. Testing

### Unit / Component Tests (Vitest + RTL)

- **TEST-001**: `closePoll` — sends POST to `/polls/{token}/close` with no body.
- **TEST-002**: `closePoll` — returns parsed `ClosePollResponse` on 200.
- **TEST-003**: `closePoll` — throws `ApiError` with status 404 on unknown token.
- **TEST-004**: `closePoll` — throws `TypeError` on network failure.
- **TEST-005**: `ManagePage` — shows "Close Poll" button for active poll.
- **TEST-006**: `ManagePage` — does not show "Close Poll" button for closed poll.
- **TEST-007**: `ManagePage` — does not show "Close Poll" button for expired poll.
- **TEST-008**: `ManagePage` — clicking "Close Poll" shows confirmation prompt.
- **TEST-009**: `ManagePage` — confirming close calls `closePoll` and refreshes page data to "Closed".
- **TEST-010**: `ManagePage` — shows error message when close fails.
- **TEST-011**: `ManagePage` — disables button and shows "Closing…" while request is in progress.

### E2E Tests (Playwright)

- **TEST-012**: ManagePage — shows "Close Poll" button for active poll.
- **TEST-013**: ManagePage — does not show "Close Poll" button for closed poll.
- **TEST-014**: ManagePage — closing poll updates status badge to "Closed".
- **TEST-015**: ManagePage — cancelling confirmation does not close the poll.
- **TEST-016**: ManagePage — shows error on close failure.

## 7. Risks & Assumptions

- **RISK-001**: Using `window.confirm` for the confirmation prompt means it cannot be styled with Tailwind. Acceptable for a hobby project — can be replaced with a custom modal in a future polish pass.
- **RISK-002**: Re-fetching the full management poll after close introduces a brief flash where the button might still be visible before the re-render. Mitigated by the `closing` state keeping the button disabled during the transition.
- **ASSUMPTION-001**: Closing is permanent — there is no "reopen" action. The PRD and backend plan both confirm this. The UI does not need an "undo" mechanism.
- **ASSUMPTION-002**: The backend returns 200 OK for closing a poll that is already closed (idempotent). The frontend `handleClosePoll` will work correctly in this case — it re-fetches and displays "Closed" regardless.
- **ASSUMPTION-003**: The `closePoll` API function sends `method: 'POST'` with no request body. The `request` helper adds `Content-Type: application/json` by default; this header is harmless on a bodiless POST.
- **ASSUMPTION-004**: The confirmation message text is `'Are you sure you want to close this poll? This action cannot be undone.'`. This can be adjusted per UX review.

## 8. Related Specifications / Further Reading

- [PRD — MP-007 User Story](docs/PRD.md) — "Close a poll manually" acceptance criteria (§10.7).
- [Frontend Instructions §5.5](../.github/instructions/frontend.instructions.md) — ManagePage behaviour specification: "Close Poll button with a confirmation prompt."
- [Frontend Instructions §4.2](../.github/instructions/frontend.instructions.md) — Backend endpoint table showing `POST /api/polls/{token}/close`.
- [Frontend Instructions §4.3](../.github/instructions/frontend.instructions.md) — Error handling conventions (404, 410, network errors).
- [MP-007 Backend Plan](docs/tasks/MP-007-Backend.md) — Backend plan defining the `ClosePollResult` response shape and `POST /api/polls/{token}/close` endpoint.
- [MP-006 Frontend Plan](docs/tasks/MP-006-Frontend.md) — Prior plan that implemented the base `ManagePage` component.

## Verification

- `npm test` from `frontend/` — all existing tests still pass, plus the 11 new Vitest tests (4 API + 7 page) pass.
- `npm run test:e2e` from `frontend/` — all existing E2E tests pass, plus the 5 new Playwright specs pass.
- `npx tsc --noEmit` from `frontend/` — zero type errors.
- Manual: start the backend and frontend dev servers. Create a poll, navigate to `/manage/{token}`. Verify: "Close Poll" button is visible for the active poll. Click "Close Poll" — confirm the browser confirmation dialog appears. Cancel — verify nothing changes. Confirm — verify the button disappears, the status badge changes to "Closed", and the poll data re-renders. Navigate to the voting link `/p/{slug}` — verify it redirects to results with a "Closed" status badge. Return to `/manage/{token}` — verify the "Close Poll" button is no longer shown. Navigate to `/manage/bogus-token` and attempt to close — verify 404 handling.
