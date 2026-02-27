---
goal: "MP-005 Frontend — Prevent Duplicate Votes"
version: 1.0
date_created: 2026-02-27
last_updated: 2026-02-27
status: 'Planned'
tags: [feature]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Implement the frontend duplicate-vote prevention UX for user story MP-005. The core infrastructure already exists: `VotePage` calls `checkVote` on mount and redirects to `ResultsPage` when the IP has already voted, and the `handleVote` handler catches 409/410 errors and navigates to results. The **gap** is that `ResultsPage` does not display a message indicating the user has already voted — the PRD acceptance criteria explicitly require: "the voter sees the current results **with a message indicating they have already voted**." This plan adds route state signalling from `VotePage` to `ResultsPage`, an "already voted" info banner on the results page, and updates the 409 handling to optionally use the enriched response body from the backend (MP-005-Backend enriches 409 with poll results). Tests are updated accordingly.

## 1. Requirements & Constraints

- **REQ-001**: If the voter's IP address has already been recorded for the poll, the voting form must not be shown.
- **REQ-002**: Instead, the voter must see the current results **with a message indicating they have already voted**.
- **REQ-003**: The duplicate vote must not be recorded in the database (backend responsibility; frontend must not retry).
- **CON-001**: Use local `useState` for page-level state — no Zustand store changes (frontend instructions §6).
- **CON-002**: The `castVote` API function throws `ApiError` on non-2xx responses; the caller handles routing (existing pattern).
- **CON-003**: React Router route state is the mechanism for passing transient flags between pages (established pattern in `PollCreatedPage`).
- **GUD-001**: Render `NotFoundPage` inline on 404 — do not navigate away (frontend instructions §3).
- **GUD-002**: Prefer ARIA role + accessible name selectors in E2E tests (frontend instructions §9.2).
- **PAT-001**: Follow existing `VotePage` `useEffect` pattern with cancellation flag for async loads.
- **PAT-002**: Follow existing `ResultsPage` rendering pattern for status badges, progress bars, heading styles.

## 2. Implementation Steps

### Implementation Phase 1 — Pass "already voted" context from VotePage to ResultsPage

- GOAL-001: When VotePage detects that the user has already voted (via `checkVote` preflight or `castVote` 409 response), navigate to ResultsPage with route state indicating the duplicate vote, so ResultsPage can display an info banner.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | In [VotePage.tsx](frontend/src/pages/VotePage.tsx#L56), update the `navigate` call inside the `checkVote` success branch (when `voteCheck.hasVoted` is true) to pass route state: `navigate(`/p/${slug}/results`, { replace: true, state: { alreadyVoted: true } })`. | | |
| TASK-002 | In [VotePage.tsx](frontend/src/pages/VotePage.tsx#L84), update the `handleVote` catch branch for `ApiError` 409 to pass route state: `navigate(`/p/${slug}/results`, { state: { alreadyVoted: true } })`. This signals to ResultsPage that the navigation was triggered by a duplicate vote attempt. | | |
| TASK-003 | In [VotePage.tsx](frontend/src/pages/VotePage.tsx#L49-L50), update the `isClosed` redirect to pass `{ state: { pollClosed: true } }` so ResultsPage can optionally distinguish between "already voted" and "poll closed" arrivals. The `replace: true` flag is already set. | | |

### Implementation Phase 2 — Display "already voted" banner on ResultsPage

- GOAL-002: ResultsPage reads the route state and conditionally renders an informational banner when the user was redirected due to a duplicate vote, satisfying acceptance criterion REQ-002.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-004 | In [ResultsPage.tsx](frontend/src/pages/ResultsPage.tsx), import `useLocation` from `react-router-dom`. Add local state or a derived constant to read `location.state?.alreadyVoted` (type-guarded as `boolean`). | | |
| TASK-005 | In [ResultsPage.tsx](frontend/src/pages/ResultsPage.tsx#L67-L72), add a conditional banner between the heading/status-badge row and the total-votes text. When `alreadyVoted` is truthy, render an info banner `<div>` with a message such as "You have already voted on this poll." styled as a rounded info box: `bg-primary-500/10 border border-primary-500/30 text-primary-300 text-sm rounded-lg px-4 py-3 mb-4`. Use `role="status"` for accessibility so screen readers announce it. | | |
| TASK-006 | Ensure the "already voted" banner does NOT render when ResultsPage is accessed directly (e.g., user navigates to `/p/:slug/results` manually or arrives from a successful vote). Route state will be absent in those cases, so the banner naturally won't appear. No extra logic needed — just confirm the guard handles `null`/`undefined` state. | | |

### Implementation Phase 3 — Update existing tests

- GOAL-003: Update VotePage unit tests and E2E tests to verify that the "already voted" route state is passed, and add ResultsPage tests for the new banner.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-007 | In [VotePage.test.tsx](frontend/tests/pages/VotePage.test.tsx#L137-L142), update the test `navigates to results with replace:true when checkVote returns hasVoted: true` to also assert that `mockNavigate` was called with `{ replace: true, state: { alreadyVoted: true } }` as the second argument. | | |
| TASK-008 | In [VotePage.test.tsx](frontend/tests/pages/VotePage.test.tsx#L161-L169), update the test `navigates to results on ApiError(409) during vote submission` to assert that `mockNavigate` was called with `/p/test1/results` and `{ state: { alreadyVoted: true } }`. | | |
| TASK-009 | In [ResultsPage.test.tsx](frontend/tests/pages/ResultsPage.test.tsx), add a new test: `shows "already voted" banner when route state has alreadyVoted: true`. Render ResultsPage inside `<MemoryRouter initialEntries={[{ pathname: '/p/test1/results', state: { alreadyVoted: true } }]}>`. Assert that a text matching "already voted" (case-insensitive) is visible in the document. | | |
| TASK-010 | In [ResultsPage.test.tsx](frontend/tests/pages/ResultsPage.test.tsx), add a new test: `does not show "already voted" banner when route state is absent`. Render ResultsPage with no route state. Assert that no text matching "already voted" is present. | | |
| TASK-011 | In [ResultsPage.test.tsx](frontend/tests/pages/ResultsPage.test.tsx), add a new test: `does not show "already voted" banner when route state has alreadyVoted: false`. Edge-case coverage for explicit false. | | |
| TASK-012 | In [vote.spec.ts](frontend/e2e/vote.spec.ts#L165-L172), the existing test `redirects to results when vote-check returns hasVoted: true` already verifies navigation to `/p/test1/results`. No URL-level change needed, but the banner should now be visible on the results page. Update this test to additionally assert that a text matching "already voted" is visible on the results page after the redirect. | | |
| TASK-013 | In [vote.spec.ts](frontend/e2e/vote.spec.ts#L195-L203), the existing test `navigates to results on 409 from castVote` verifies the URL change. Update the 409 mock to return the enriched response body matching the MP-005-Backend plan (containing `message` and `results` fields). After redirect, assert the "already voted" banner is visible. | | |
| TASK-014 | In [results.spec.ts](frontend/e2e/results.spec.ts), add a new E2E test: `does not show "already voted" banner on direct navigation`. Navigate directly to `/p/test1/results` (no route state). Assert that no "already voted" text is visible. This confirms the banner is absent for normal results viewing. | | |

### Implementation Phase 4 — Verify existing infrastructure (no changes needed)

- GOAL-004: Confirm that existing code already satisfies the remaining MP-005 acceptance criteria. Document for traceability.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-015 | **No change.** [VotePage.tsx](frontend/src/pages/VotePage.tsx#L52-L57) already calls `checkVote(slug!)` on mount and redirects to results if `hasVoted` is true — satisfying REQ-001 (voting form not shown for duplicate voter). | | |
| TASK-016 | **No change.** [VotePage.tsx](frontend/src/pages/VotePage.tsx#L82-L86) already catches `ApiError` 409 and 410 from `castVote` and navigates to results — server-side enforcement works as a safety net if the preflight check fails. | | |
| TASK-017 | **No change.** The `checkVote` API function in [polls.ts](frontend/src/api/polls.ts#L80-L82) correctly calls `GET /api/polls/{slug}/vote-check`. | | |
| TASK-018 | **No change.** Graceful degradation in [VotePage.tsx](frontend/src/pages/VotePage.tsx#L58-L60): if `checkVote` fails (network error), the form is still shown and the backend rejects the duplicate vote at submission time. | | |

## 3. Alternatives

- **ALT-001: Use 409 response body results directly instead of re-fetching** — When `castVote` returns 409, the enriched backend response (MP-005-Backend) includes `PollResults` in the body. The frontend could extract these results from the `ApiError.body`, pass them to ResultsPage via route state, and skip the `getResults` fetch. Rejected because: (a) the vote-check redirect path doesn't have results pre-loaded, so ResultsPage would need conditional fetching logic for both scenarios; (b) route state with large payloads is fragile across page refreshes; (c) the additional `getResults` call is negligible overhead for a hobby app and keeps ResultsPage's data loading consistent.
- **ALT-002: Show results inline on VotePage instead of redirecting** — Instead of navigating to ResultsPage, render results directly within VotePage when a duplicate is detected. Rejected because it duplicates the entire results rendering logic and deviates from the established navigation pattern where VotePage always navigates to ResultsPage after any vote outcome.
- **ALT-003: Use Zustand store to persist "already voted" flag** — Store the flag in a Zustand store instead of React Router state. Rejected because the flag is page-transition-specific and should not persist beyond the initial navigation. Route state naturally clears on refresh, which is the correct behaviour (the user can still see results; they just won't see the transient banner).

## 4. Dependencies

- **DEP-001**: MP-005-Backend must be implemented so the `POST /api/polls/{slug}/votes` endpoint returns 409 with results in the body. However, the frontend plan works even without the enriched 409 body — the VotePage simply navigates to ResultsPage which fetches results independently. The enriched body is a nice-to-have optimization deferred to ALT-001.
- **DEP-002**: No new npm packages required. All functionality uses existing React Router state, React hooks, and Tailwind CSS utilities.

## 5. Files

- **FILE-001**: [frontend/src/pages/VotePage.tsx](frontend/src/pages/VotePage.tsx) — Update three `navigate` calls to pass `{ alreadyVoted: true }` (or `{ pollClosed: true }`) in route state.
- **FILE-002**: [frontend/src/pages/ResultsPage.tsx](frontend/src/pages/ResultsPage.tsx) — Import `useLocation`, read `alreadyVoted` from route state, conditionally render info banner.
- **FILE-003**: [frontend/tests/pages/VotePage.test.tsx](frontend/tests/pages/VotePage.test.tsx) — Update two existing navigate-assertion tests to verify route state includes `alreadyVoted: true`.
- **FILE-004**: [frontend/tests/pages/ResultsPage.test.tsx](frontend/tests/pages/ResultsPage.test.tsx) — Add three new tests for "already voted" banner presence/absence.
- **FILE-005**: [frontend/e2e/vote.spec.ts](frontend/e2e/vote.spec.ts) — Update two existing tests to assert the "already voted" banner is visible after redirect.
- **FILE-006**: [frontend/e2e/results.spec.ts](frontend/e2e/results.spec.ts) — Add one new test confirming the banner is absent on direct navigation.

## 6. Testing

- **TEST-001**: (Update) `VotePage.test.tsx` — `navigates to results with replace:true when checkVote returns hasVoted: true` — assert `mockNavigate` second argument includes `state: { alreadyVoted: true }`.
- **TEST-002**: (Update) `VotePage.test.tsx` — `navigates to results on ApiError(409) during vote submission` — assert `mockNavigate` second argument includes `state: { alreadyVoted: true }`.
- **TEST-003**: (New) `ResultsPage.test.tsx` — `shows "already voted" banner when route state has alreadyVoted: true` — render with `MemoryRouter` and `initialEntries` containing `state: { alreadyVoted: true }`, mock `getResults` to return fixture, assert text "already voted" is visible.
- **TEST-004**: (New) `ResultsPage.test.tsx` — `does not show "already voted" banner when route state is absent` — render without state, assert "already voted" text is absent.
- **TEST-005**: (New) `ResultsPage.test.tsx` — `does not show "already voted" banner when route state has alreadyVoted: false` — same as TEST-004 but with explicit `false`.
- **TEST-006**: (Update) `vote.spec.ts` — `redirects to results when vote-check returns hasVoted: true` — after URL assertion, also check `page.getByText(/already voted/i)` is visible.
- **TEST-007**: (Update) `vote.spec.ts` — `navigates to results on 409 from castVote` — after URL assertion, check "already voted" banner is visible.
- **TEST-008**: (New) `results.spec.ts` — `does not show "already voted" banner on direct navigation` — navigate to `/p/test1/results`, assert "already voted" text is not visible.

## 7. Risks & Assumptions

- **RISK-001**: React Router route state is lost on page refresh. If the user refreshes `/p/:slug/results` after being redirected, the "already voted" banner will disappear. This is acceptable — the banner is informational, not functional, and the user can see the results regardless.
- **RISK-002**: The `checkVote` preflight request uses the voter's IP as detected by the backend. Users behind shared NATs or VPNs may be incorrectly identified as having already voted. This is an accepted trade-off documented in the PRD (§8.4).
- **ASSUMPTION-001**: The `ResultsPage` `useLocation` hook will correctly read route state passed by `navigate`. This is standard React Router v7 behaviour and is already used successfully in `PollCreatedPage`.
- **ASSUMPTION-002**: The `MemoryRouter` `initialEntries` prop supports the `state` field for test setup. This is documented in React Router's testing guide and matches the `MemoryRouter` API.
- **ASSUMPTION-003**: E2E tests (Playwright) that involve client-side navigation via React Router will naturally pass route state to the destination page. The banner assertion in the E2E tests validates this end-to-end.

## 8. Related Specifications / Further Reading

- [PRD — MP-005 User Story](docs/PRD.md) — "Prevent duplicate votes" acceptance criteria (lines 274–280).
- [MP-005-Backend Plan](docs/tasks/MP-005-Backend.md) — Backend enrichment of 409 response with poll results.
- [MP-003-Frontend Plan](docs/tasks/MP-003-Frontend.md) — Original implementation of VotePage, ResultsPage, and the vote-check flow.
- [Frontend Instructions §4.3](../.github/instructions/frontend.instructions.md) — Error handling conventions: "On 409 (duplicate vote), display the current results with an 'already voted' message."
- [Frontend Instructions §5.3](../.github/instructions/frontend.instructions.md) — VotePage behaviour specification: "If already voted or poll is closed/expired → redirect to /p/:slug/results."
