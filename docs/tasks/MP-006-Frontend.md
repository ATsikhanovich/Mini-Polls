---
goal: Implement frontend for MP-006 — View results via management link
version: 1.0
date_created: 2026-02-27
status: 'Planned'
tags: feature, frontend, management, results
---

# MP-006 Frontend — View Results via Management Link

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Implement the `ManagePage` component so that a poll creator can open `/manage/:token`, see the poll question, all options with live vote counts and percentages, total vote count, poll status, and the public voting link — all fetched from `GET /api/polls/by-token/{token}`. The route is already wired in `App.tsx`, but the page component is a stub returning `<div />`. This plan covers the API function, TypeScript type, page implementation, and all three test layers. Close-poll and set-expiration actions are out of scope (MP-007 and MP-008).

## 1. Requirements & Constraints

- **REQ-001**: Opening `/manage/:token` displays the poll question, all options with vote counts and percentages, and the total number of votes — per MP-006 acceptance criteria.
- **REQ-002**: The results update when the page is refreshed (standard full-page refresh re-fetches data from the API).
- **REQ-003**: The management page is accessible regardless of whether the creator has voted (no `vote-check` call, no IP gating).
- **REQ-004**: If the token is invalid (404 from backend), render `NotFoundPage` inline — per frontend instructions §3 route rules.
- **REQ-005**: Display the poll status badge (active/closed/expired) using the existing `StatusBadge` component and `derivePollStatus` utility.
- **REQ-006**: Display the public voting link with a `CopyButton` so the creator can easily share it.
- **CON-001**: MP-006 only covers viewing results. Do NOT implement close-poll button or set-expiration picker (those are MP-007 and MP-008).
- **CON-002**: No new dependencies. Use only existing libraries (React, React Router, Tailwind, Vitest, RTL, Playwright).
- **CON-003**: API functions are pure HTTP helpers — no React state or hooks inside `api/polls.ts` (frontend instructions §4.1).
- **CON-004**: Local `useState` for page-level data fetching — no Zustand store needed (frontend instructions §6).
- **PAT-001**: Follow the data-fetching pattern established in `ResultsPage` and `VotePage`: `useState` for `data | null`, `loading`, `error`, `notFound`; `useEffect` with cancellation flag; conditional rendering for each state.
- **PAT-002**: Follow the test-mocking pattern from `ResultsPage.test.tsx`: `vi.mock` the API module, mock `useParams`, render with `MemoryRouter`.
- **PAT-003**: Follow the E2E pattern from `results.spec.ts`: mock API via `page.route()`, use ARIA selectors, verify visible text and element counts.
- **GUD-001**: Components use `function` declarations, named exports for shared components, default export for page components — per frontend instructions §11.
- **GUD-002**: Keep the page under ~150 lines. If results rendering grows, consider extracting into a shared sub-component, but prefer inline for now since `ResultsPage` already renders results inline at ~100 lines.

## 2. Implementation Steps

### Phase 1 — TypeScript Types

- GOAL-001: Define the `ManagementPoll` type matching the backend `ManagementPollDto` response shape.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | **Add `ManagementOption` interface** to `frontend/src/types/poll.ts`. Properties: `id: string`, `text: string`, `sortOrder: number`, `voteCount: number`, `percentage: number`. This mirrors the backend `ManagementOptionDto` and is distinct from the existing `PollOption` (which has no vote data) and `OptionResult` (which has no `sortOrder`). | ✅ | 2026-02-27 |
| TASK-002 | **Add `ManagementPoll` interface** to `frontend/src/types/poll.ts`. Properties: `id: string`, `question: string`, `slug: string`, `isClosed: boolean`, `expiresAt: string | null`, `closedAt: string | null`, `createdAt: string`, `totalVotes: number`, `options: ManagementOption[]`. This combines poll metadata with results data in a single type, matching the backend `ManagementPollDto`. Note it includes `closedAt` (unlike the existing `Poll` type) which is needed to distinguish manual closure from expiration. | ✅ | 2026-02-27 |
| TASK-003 | **Add `ManagementPoll` and `ManagementOption` to the type exports** so they are available for import by the API module and page component. | ✅ | 2026-02-27 |

### Phase 2 — API Function

- GOAL-002: Add the `getPollByManagementToken` function to the API client.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-004 | **Add `getPollByManagementToken` function** to `frontend/src/api/polls.ts`. Signature: `export function getPollByManagementToken(token: string): Promise<ManagementPoll>`. Implementation: call `request<ManagementPoll>(`/polls/by-token/${token}`)` — a simple GET using the existing `request` helper. Import `ManagementPoll` from `../types/poll`. This follows the identical pattern of `getPollBySlug`. | ✅ | 2026-02-27 |

### Phase 3 — ManagePage Implementation

- GOAL-003: Replace the stub `ManagePage` with a full implementation that fetches and displays management poll data.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | **Replace the stub** in `frontend/src/pages/ManagePage.tsx` with a full page component. Use the `useParams<{ token: string }>()` hook to read the `token` route parameter. Set up state variables following the `ResultsPage` / `VotePage` pattern: `data: ManagementPoll | null`, `loading: boolean`, `error: string | null`, `notFound: boolean`. | ✅ | 2026-02-27 |
| TASK-006 | **Add data-fetching `useEffect`** that calls `getPollByManagementToken(token!)`. On success, set `data`. On `ApiError` with status 404, set `notFound = true`. On any other error, set `error` to a generic message. Use a `cancelled` flag for cleanup, matching the pattern in `ResultsPage`. | ✅ | 2026-02-27 |
| TASK-007 | **Render loading state**: when `loading` is true, show `<p className="text-center text-white/60">Loading…</p>` — same markup as `ResultsPage` and `VotePage`. | ✅ | 2026-02-27 |
| TASK-008 | **Render not-found state**: when `notFound` is true, render `<NotFoundPage />` inline — same pattern as `ResultsPage` and `VotePage`. Import `NotFoundPage` from `./NotFoundPage`. | ✅ | 2026-02-27 |
| TASK-009 | **Render error state**: when `data` is null and not loading, render `<ErrorMessage message={error} />`. | ✅ | 2026-02-27 |
| TASK-010 | **Render poll heading and status**: display the poll question as an `<h1>` with the same styling as `ResultsPage` (`text-2xl font-bold text-[#f8f8f8] tracking-tight`). Next to it, render a `StatusBadge` with the status derived from `derivePollStatus(data.isClosed, data.expiresAt)`. Unlike `ResultsPage` which only shows the badge when closed, the management page should always show the badge (including "Active") so the creator always knows the current state. | ✅ | 2026-02-27 |
| TASK-011 | **Render total vote count**: display `"{totalVotes} vote(s) total"` text below the heading, matching the style from `ResultsPage` (`text-sm text-white/60 mb-4`). | ✅ | 2026-02-27 |
| TASK-012 | **Render options with results**: iterate `data.options` (already ordered by `sortOrder` from the backend) and for each option render: the option text as `<p>` (`font-medium text-[#f8f8f8] mb-1`), vote count and percentage as `<span>` (`text-sm text-white/60`), and a `<ProgressBar percentage={option.percentage} />`. This follows the exact same markup structure used in `ResultsPage`. | ✅ | 2026-02-27 |
| TASK-013 | **Render voting link section**: below the results, display the public voting link in a bordered card (matching the style from `PollCreatedPage`). Compute the voting URL as `` `${window.location.origin}/p/${data.slug}` ``. Show the URL text in a `<span>` with `font-mono text-sm text-primary-300 break-all` and a `<CopyButton value={votingUrl} />` alongside it. This lets the creator copy and share the link without returning to the confirmation page. | ✅ | 2026-02-27 |
| TASK-014 | **Imports**: import `useState`, `useEffect` from `react`; `useParams` from `react-router-dom`; `getPollByManagementToken`, `ApiError` from `../api/polls`; `ProgressBar` from `../components/ProgressBar`; `StatusBadge` from `../components/StatusBadge`; `CopyButton` from `../components/CopyButton`; `ErrorMessage` from `../components/ErrorMessage`; `derivePollStatus` from `../utils/derivePollStatus`; `ManagementPoll` type from `../types/poll`; `NotFoundPage` from `./NotFoundPage`. | ✅ | 2026-02-27 |

### Phase 4 — API Unit Tests

- GOAL-004: Add unit tests for `getPollByManagementToken` in the existing API test file.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-015 | **Add `getPollByManagementToken` to imports** at the top of `frontend/tests/api/polls.test.ts`. | ✅ | 2026-02-27 |
| TASK-016 | **Add `describe('getPollByManagementToken', ...)` block** to `frontend/tests/api/polls.test.ts`, following the existing pattern from `getPollBySlug` and `getResults` tests. Define a `managementPollPayload` fixture matching the `ManagementPoll` shape: `{ id: 'poll-1', question: 'Best colour?', slug: 'col12', isClosed: false, expiresAt: null, closedAt: null, createdAt: '2026-01-01T00:00:00Z', totalVotes: 3, options: [{ id: 'opt-1', text: 'Red', sortOrder: 0, voteCount: 2, percentage: 66.7 }, { id: 'opt-2', text: 'Blue', sortOrder: 1, voteCount: 1, percentage: 33.3 }] }`. | ✅ | 2026-02-27 |
| TASK-017 | Test: **`sends GET to /polls/by-token/{token}`** — mock fetch with 200 and the fixture payload, call `getPollByManagementToken('my-token')`, assert that the URL ends with `/polls/by-token/my-token` and the method is GET (not POST). Assert `Content-Type: application/json` header is present. | ✅ | 2026-02-27 |
| TASK-018 | Test: **`returns parsed ManagementPoll on 200`** — mock fetch with 200 and fixture, call function, assert result deep-equals the fixture. | ✅ | 2026-02-27 |
| TASK-019 | Test: **`throws ApiError with status 404 when token not found`** — mock fetch with 404 response, assert the call rejects with `{ status: 404 }`. | ✅ | 2026-02-27 |
| TASK-020 | Test: **`throws on network failure`** — mock fetch rejecting with `TypeError('Failed to fetch')`, assert the call rejects with `TypeError`. | ✅ | 2026-02-27 |

### Phase 5 — Page Component Tests (Vitest + RTL)

- GOAL-005: Add unit/component tests for `ManagePage` covering all render states and key UI elements.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-021 | **Create `frontend/tests/pages/ManagePage.test.tsx`**. Set up mocking following the `ResultsPage.test.tsx` pattern: `vi.mock('../../src/api/polls', ...)` to mock `getPollByManagementToken` while preserving `ApiError`; `vi.mock('react-router-dom', ...)` to mock `useParams` returning `{ token: 'mgmt-tok' }`. Import the mocked function and the real page component. | ✅ | 2026-02-27 |
| TASK-022 | **Define a `managementPollFixture`** constant matching the `ManagementPoll` shape with sample data: question, slug, `isClosed: false`, `expiresAt: null`, `closedAt: null`, `totalVotes: 3`, and 2 options with vote counts and percentages. | ✅ | 2026-02-27 |
| TASK-023 | **Define a `renderPage` helper** that wraps `<ManagePage />` in `<MemoryRouter>` and calls `render(...)`, same pattern as `ResultsPage.test.tsx`. | ✅ | 2026-02-27 |
| TASK-024 | Test: **`shows "Loading…" while fetching`** — mock `getPollByManagementToken` to return an unresolved promise (`new Promise(() => {})`), render, assert `Loading…` text is present. | ✅ | 2026-02-27 |
| TASK-025 | Test: **`renders poll question as heading`** — resolve the mock with fixture data, render, assert an `<h1>` heading with the question text is present via `findByRole('heading', { name })`. | ✅ | 2026-02-27 |
| TASK-026 | Test: **`displays total vote count text`** — resolve mock, render, assert text matching `/3 votes total/i` is present. | ✅ | 2026-02-27 |
| TASK-027 | Test: **`renders each option with text, vote count, and percentage`** — resolve mock, render, assert each option text is visible, vote counts appear, and percentage strings appear. | ✅ | 2026-02-27 |
| TASK-028 | Test: **`renders ProgressBar for each option`** — resolve mock, render, assert `getAllByRole('progressbar')` has length equal to the number of options. | ✅ | 2026-02-27 |
| TASK-029 | Test: **`shows "Active" StatusBadge when poll is active`** — resolve mock with `isClosed: false`, render, assert text "Active" is visible. This differs from `ResultsPage` which hides the badge for active polls. | ✅ | 2026-02-27 |
| TASK-030 | Test: **`shows "Closed" StatusBadge when poll is closed`** — resolve mock with `isClosed: true, closedAt: '2026-02-01T00:00:00Z'`, render, assert text "Closed" is visible. | ✅ | 2026-02-27 |
| TASK-031 | Test: **`shows "Expired" StatusBadge when poll is expired`** — resolve mock with `isClosed: true, expiresAt: '2026-01-01T00:00:00Z'` (a past date), render, assert text "Expired" is visible. | ✅ | 2026-02-27 |
| TASK-032 | Test: **`renders voting link with CopyButton`** — resolve mock, render, assert a text element containing `/p/{slug}` is present and a button with accessible name "Copy" is present. | ✅ | 2026-02-27 |
| TASK-033 | Test: **`renders NotFoundPage on 404`** — mock `getPollByManagementToken` rejecting with `new ApiError(404, null)`, render, wait for loading to disappear, assert the question heading is NOT present (NotFoundPage rendered instead). Follows pattern from `ResultsPage.test.tsx`. | ✅ | 2026-02-27 |
| TASK-034 | Test: **`shows generic error on network failure`** — mock rejecting with `TypeError('Failed to fetch')`, render, assert text matching `/something went wrong/i` is present. | ✅ | 2026-02-27 |

### Phase 6 — E2E Tests (Playwright)

- GOAL-006: Add Playwright E2E specs for the management page user flow.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-035 | **Create `frontend/e2e/manage.spec.ts`**. Define a `defaultManagementPoll` fixture matching the `ManagementPoll` shape. Define a `mockGetPollByToken(page, data)` helper that intercepts `**/api/polls/by-token/*` via `page.route()` and fulfills with 200 + JSON body. Follow the pattern from `results.spec.ts`. | ✅ | 2026-02-27 |
| TASK-036 | Test: **`displays the poll question heading`** — mock API, navigate to `/manage/test-token`, assert heading with the question text is visible. | ✅ | 2026-02-27 |
| TASK-037 | Test: **`shows total vote count`** — mock API, navigate, assert text matching total votes pattern is visible. | ✅ | 2026-02-27 |
| TASK-038 | Test: **`displays each option with vote count and percentage`** — mock API, navigate, assert each option text, vote count text, and percentage text is visible. | ✅ | 2026-02-27 |
| TASK-039 | Test: **`renders progress bars for each option`** — mock API, navigate, assert `page.getByRole('progressbar')` has count equal to number of options. | ✅ | 2026-02-27 |
| TASK-040 | Test: **`shows "Active" badge for active poll`** — mock API with `isClosed: false`, navigate, assert "Active" text is visible. | ✅ | 2026-02-27 |
| TASK-041 | Test: **`shows "Closed" badge for closed poll`** — mock API with `isClosed: true`, navigate, assert "Closed" text is visible. | ✅ | 2026-02-27 |
| TASK-042 | Test: **`shows voting link with Copy button`** — mock API, navigate, assert voting URL text and a "Copy" button are visible. | ✅ | 2026-02-27 |
| TASK-043 | Test: **`shows not-found content for invalid token (404)`** — mock API returning 404, navigate, assert poll question heading is NOT visible. | ✅ | 2026-02-27 |
| TASK-044 | Test: **`shows generic error on network failure`** — mock API with `route.abort('failed')`, navigate, assert "something went wrong" text is visible. | ✅ | 2026-02-27 |

## 3. Alternatives

- **ALT-001: Reuse `PollResults` type and `getResults` API function, making a second call for poll metadata** — The management page could call `getResults(slug)` for vote data and a hypothetical `getPollByToken(token)` for metadata. Rejected because the backend's `ManagementPollDto` already combines both in a single response, avoiding an extra round-trip and requiring knowledge of the slug (which the creator may not have).
- **ALT-002: Extract a shared `ResultsList` component used by both `ResultsPage` and `ManagePage`** — Both pages render the same option-list-with-progress-bars UI. Extracting would reduce duplication. Deferred for now because: (a) the markup is ~20 lines and not complex enough to warrant extraction yet; (b) `ManagePage` will gain management actions in MP-007/MP-008 that may change the layout around the results; (c) can be refactored later if duplication becomes a maintenance issue.
- **ALT-003: Use Zustand store to cache management poll data across refreshes** — Rejected per frontend instructions §6: local `useState` is preferred for page-level data fetching. Caching is unnecessary since the creator wants fresh results on each visit.
- **ALT-004: Show the `StatusBadge` only when closed/expired (same as `ResultsPage`)** — Rejected because the management page should always inform the creator of the current poll state. Showing "Active" gives positive confirmation that the poll is still accepting votes.

## 4. Dependencies

- **DEP-001**: No new npm packages required. All necessary libraries (React, React Router, Vitest, RTL, Playwright) are already installed.
- **DEP-002**: Depends on the backend `GET /api/polls/by-token/{token}` endpoint returning a `ManagementPollDto` response. See [MP-006-Backend.md](docs/tasks/MP-006-Backend.md) for the backend plan.
- **DEP-003**: Existing shared components (`ProgressBar`, `StatusBadge`, `CopyButton`, `ErrorMessage`) — all implemented and tested. No changes needed.
- **DEP-004**: Existing utility `derivePollStatus` — implemented and tested. No changes needed.

## 5. Files

- **FILE-001**: `frontend/src/types/poll.ts` — Modified. Add `ManagementOption` and `ManagementPoll` interfaces.
- **FILE-002**: `frontend/src/api/polls.ts` — Modified. Add `getPollByManagementToken` function and import `ManagementPoll`.
- **FILE-003**: `frontend/src/pages/ManagePage.tsx` — Modified (replace stub). Full implementation with data fetching, loading/error/notFound states, poll heading, status badge, results list with progress bars, voting link with copy button.
- **FILE-004**: `frontend/tests/api/polls.test.ts` — Modified. Add `describe('getPollByManagementToken', ...)` block with 4 tests.
- **FILE-005**: `frontend/tests/pages/ManagePage.test.tsx` — New file. 11 component tests covering all render states and UI elements.
- **FILE-006**: `frontend/e2e/manage.spec.ts` — New file. 9 E2E tests covering the management page user flow.

## 6. Testing

### Unit / Component Tests (Vitest + RTL)

- **TEST-001**: `getPollByManagementToken` — sends GET to correct URL with Content-Type header.
- **TEST-002**: `getPollByManagementToken` — returns parsed `ManagementPoll` on 200.
- **TEST-003**: `getPollByManagementToken` — throws `ApiError` with status 404 on unknown token.
- **TEST-004**: `getPollByManagementToken` — throws `TypeError` on network failure.
- **TEST-005**: `ManagePage` — shows "Loading…" while fetching.
- **TEST-006**: `ManagePage` — renders poll question as heading.
- **TEST-007**: `ManagePage` — displays total vote count text.
- **TEST-008**: `ManagePage` — renders each option with text, vote count, and percentage.
- **TEST-009**: `ManagePage` — renders `ProgressBar` for each option.
- **TEST-010**: `ManagePage` — shows "Active" `StatusBadge` when poll is active.
- **TEST-011**: `ManagePage` — shows "Closed" `StatusBadge` when closed.
- **TEST-012**: `ManagePage` — shows "Expired" `StatusBadge` when expired.
- **TEST-013**: `ManagePage` — renders voting link with `CopyButton`.
- **TEST-014**: `ManagePage` — renders `NotFoundPage` on 404 error.
- **TEST-015**: `ManagePage` — shows generic error on network failure.

### E2E Tests (Playwright)

- **TEST-016**: ManagePage — displays poll question heading.
- **TEST-017**: ManagePage — shows total vote count.
- **TEST-018**: ManagePage — displays each option with vote count and percentage.
- **TEST-019**: ManagePage — renders progress bars for each option.
- **TEST-020**: ManagePage — shows "Active" badge for active poll.
- **TEST-021**: ManagePage — shows "Closed" badge for closed poll.
- **TEST-022**: ManagePage — shows voting link with Copy button.
- **TEST-023**: ManagePage — shows not-found content for invalid token.
- **TEST-024**: ManagePage — shows generic error on network failure.

## 7. Risks & Assumptions

- **RISK-001**: The `ManagePage` currently renders `<div />` (stub). Replacing it is a non-breaking change since no other component or test depends on its output.
- **RISK-002**: The `ManagementPoll` type includes `closedAt` which the existing `Poll` type does not. If the backend response shape changes, only `ManagementPoll` and `ManagePage` are affected — no impact on voting or results flows.
- **ASSUMPTION-001**: The backend `GET /api/polls/by-token/{token}` returns options pre-sorted by `sortOrder`, so the frontend does not need to re-sort. If the backend doesn't guarantee order, add `.sort((a, b) => a.sortOrder - b.sortOrder)` in the page component.
- **ASSUMPTION-002**: The management page does not need auto-refresh or polling. "Results update when the page is refreshed" means a standard browser refresh triggers a new `useEffect` fetch, which is inherent to the React page lifecycle.
- **ASSUMPTION-003**: The voting URL displayed on the management page is constructed client-side as `${window.location.origin}/p/${slug}`. This matches the convention used in `PollCreatedPage` where the voting URL is passed as route state. If the backend already provides a full URL in the future, the implementation can switch to using that instead.
- **ASSUMPTION-004**: `NotFoundPage` is currently a stub (`<div />`). MP-006 renders it inline for 404 consistency with other pages. When MP-009 (Handle invalid poll links) is implemented, `NotFoundPage` will be fleshed out, and `ManagePage` will automatically benefit.

## 8. Related Specifications / Further Reading

- [PRD — MP-006 User Story](docs/PRD.md) — "View results via management link" acceptance criteria (§10.6).
- [Frontend Instructions §3](../.github/instructions/frontend.instructions.md) — Route table showing `/manage/:token` → `ManagePage`.
- [Frontend Instructions §4.2](../.github/instructions/frontend.instructions.md) — Backend endpoint table showing `GET /api/polls/by-token/{token}`.
- [Frontend Instructions §5.5](../.github/instructions/frontend.instructions.md) — ManagePage behaviour specification.
- [Frontend Instructions §9](../.github/instructions/frontend.instructions.md) — Testing conventions for Vitest + RTL and Playwright.
- [MP-006 Backend Plan](docs/tasks/MP-006-Backend.md) — Backend plan defining the `ManagementPollDto` response shape and `GET /api/polls/by-token/{token}` endpoint.

## Verification

- `npm test` from `frontend/` — all existing tests still pass, plus the 15 new Vitest tests (4 API + 11 page) pass.
- `npm run test:e2e` from `frontend/` — all existing E2E tests pass, plus the 9 new Playwright specs pass.
- `npx tsc --noEmit` from `frontend/` — zero type errors.
- Manual: start the backend and frontend dev servers, create a poll via the creation form, note the management token, navigate to `/manage/{token}` in the browser. Verify: poll question is displayed, all options show vote counts (0 initially) with progress bars, status badge shows "Active", voting link is shown with a working Copy button. Cast a vote via the voting link, then refresh the management page — verify vote counts are updated. Navigate to `/manage/bogus-token` — verify the not-found page renders.
