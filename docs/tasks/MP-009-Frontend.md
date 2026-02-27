---
goal: Implement frontend for MP-009 — Handle invalid poll links with a friendly NotFoundPage
version: 1.0
date_created: 2026-02-27
status: 'Planned'
tags: feature, frontend, error-handling, 404, not-found
---

# MP-009 Frontend — Handle Invalid Poll Links

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Implement the `NotFoundPage` component (currently a stub `<div />`) so that users see a friendly "Poll not found" message with a link back to the home page whenever they visit a non-existent poll slug or invalid management token. The page-level 404 handling already exists in `VotePage`, `ResultsPage`, and `ManagePage` (each catches `ApiError(404)` and renders `<NotFoundPage />` inline). The React Router catch-all (`*`) route also renders `NotFoundPage` for completely unknown URLs. All that's missing is the actual content inside `NotFoundPage`. Additionally, existing unit and E2E tests that verify 404 behaviour only assert the absence of normal content (because the component is a stub) — these must be updated to assert the presence of the "Poll not found" message and the home link.

## 1. Requirements & Constraints

- **REQ-001**: Visiting a non-existent short link slug displays a 404 page with a clear message (e.g., "Poll not found") — per MP-009 acceptance criterion 1.
- **REQ-002**: Visiting an invalid management token displays a 404 page — per MP-009 acceptance criterion 2.
- **REQ-003**: The 404 page includes a link back to the home page to create a new poll — per MP-009 acceptance criterion 3.
- **REQ-004**: Completely unknown URLs (not matching any route) also render `NotFoundPage` — already wired via the `*` catch-all route in `App.tsx`.
- **CON-001**: Use Tailwind CSS utility classes only — no custom CSS (frontend instructions §7.1).
- **CON-002**: One component per file, filename matches default export (frontend instructions §2).
- **CON-003**: No new libraries — use existing `react-router-dom` `Link` for the home page link.
- **PAT-001**: Visual style must be consistent with the existing dark theme (`#212121` background, `#f8f8f8` text, `primary-*` accent colours) defined in `src/styles/index.css`.
- **PAT-002**: Tests follow existing patterns: Vitest + RTL for unit/component tests, Playwright with `page.route()` mocking for E2E.
- **GUD-001**: Use `function` declarations for React components, named export for shared components (frontend instructions §11).

## 2. Implementation Steps

### Phase 1 — Implement `NotFoundPage` Component

- GOAL-001: Replace the stub `NotFoundPage` with a fully styled 404 page that displays a clear message and a link to the home page.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | **Implement `NotFoundPage`** in `frontend/src/pages/NotFoundPage.tsx`. Replace the empty `<div />` with meaningful content. The component should render: (1) a heading (`<h1>`) with text "Poll not found"; (2) a descriptive paragraph stating something like "The poll you're looking for doesn't exist or the link is invalid."; (3) a `Link` (from `react-router-dom`) to `"/"` with text "Create a new poll" (or similar) styled as a primary action link/button. Use `default export` per the page component convention. Import `Link` from `react-router-dom`. Style with Tailwind: center content, use `text-[#f8f8f8]` for the heading, `text-white/60` for the description, and `text-primary-400 hover:text-primary-300` for the link (consistent with the `Layout` header link style). Add appropriate vertical spacing (`mb-*` / `mt-*` / `space-y-*`). Ensure the component is accessible — the heading communicates the error and the link is descriptive. | | |

### Phase 2 — Update Unit / Component Tests for `NotFoundPage`

- GOAL-002: Create dedicated `NotFoundPage` tests and update all page tests that render `NotFoundPage` on 404 to assert its visible content.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-002 | **Create `NotFoundPage.test.tsx`** in `frontend/tests/pages/`. Write a test class for the `NotFoundPage` component. Tests should: (a) **`renders heading "Poll not found"`** — render the component inside `<MemoryRouter>`, assert a heading with text "Poll not found" is present; (b) **`renders a link to the home page`** — assert a link (`getByRole('link')`) with text matching "Create a new poll" (or the chosen CTA text) is present and has `href="/"`. (c) **`renders descriptive text`** — assert the explanatory paragraph is visible. | | |
| TASK-003 | **Update `VotePage.test.tsx`** in `frontend/tests/pages/`. In the test `renders NotFoundPage content when getPollBySlug throws ApiError(404)`: replace the assertion `expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument()` with `expect(await screen.findByRole('heading', { name: /poll not found/i })).toBeInTheDocument()` and also assert the home link is present via `expect(screen.getByRole('link', { name: /create a new poll/i })).toBeInTheDocument()`. Do the same for the test `sets notFound on ApiError(404) during vote submission` — assert `screen.findByRole('heading', { name: /poll not found/i })` appears. | | |
| TASK-004 | **Update `ResultsPage.test.tsx`** in `frontend/tests/pages/`. In the test `renders NotFoundPage content when getResults throws ApiError(404)`: replace the weak assertion with `expect(await screen.findByRole('heading', { name: /poll not found/i })).toBeInTheDocument()` and assert the home link is present. | | |
| TASK-005 | **Update `ManagePage.test.tsx`** in `frontend/tests/pages/`. In the test `renders NotFoundPage on 404`: replace the assertions with `expect(await screen.findByRole('heading', { name: /poll not found/i })).toBeInTheDocument()` and assert the home link is present. | | |

### Phase 3 — Update E2E Tests

- GOAL-003: Update existing Playwright E2E 404 tests to assert the visible "Poll not found" heading and home page link, and add a new E2E spec for the catch-all `*` route.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | **Update `vote.spec.ts`** in `frontend/e2e/`. In the test `shows "Poll not found" content for a 404 from getPollBySlug`: replace the negative assertion `await expect(page.getByRole('heading', { name: 'Best language?' })).not.toBeVisible()` with positive assertions: `await expect(page.getByRole('heading', { name: /poll not found/i })).toBeVisible()` and `await expect(page.getByRole('link', { name: /create a new poll/i })).toBeVisible()`. | | |
| TASK-007 | **Update `results.spec.ts`** in `frontend/e2e/`. In the test `shows "Poll not found" content for a 404`: replace the negative assertion with a positive check for the "Poll not found" heading and the home link. | | |
| TASK-008 | **Update `manage.spec.ts`** in `frontend/e2e/`. In the test `shows not-found content for invalid token (404)`: replace the negative assertion with a positive check for the "Poll not found" heading and the home link. | | |
| TASK-009 | **Add a catch-all 404 E2E test.** Create a new test either in a new `frontend/e2e/not-found.spec.ts` file or appended to an existing spec. The test should navigate to a completely unknown URL (e.g., `/some/random/path`), assert the "Poll not found" heading and the home link are visible, and verify clicking the home link navigates to `/`. No API mocking is needed since no API call is made for unknown routes. | | |

### Phase 4 — Verify Integration Points (No Code Changes)

- GOAL-004: Confirm existing wiring is correct — no code changes needed, just verification.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-010 | **Verify `App.tsx` catch-all route**: confirm the `<Route path="*" element={<NotFoundPage />} />` already exists and correctly renders `NotFoundPage` for unknown URLs. Already present — no change needed. | | |
| TASK-011 | **Verify page-level 404 handling**: confirm `VotePage`, `ResultsPage`, and `ManagePage` each catch `ApiError` with status 404, set a `notFound` state flag, and render `<NotFoundPage />` inline. Already implemented — no change needed. | | |
| TASK-012 | **Verify `ApiError` propagation**: confirm `api/polls.ts` throws `ApiError` with the correct `status` and `body` fields on non-2xx responses where the backend returns ProblemDetails 404. Already working via the generic `request<T>()` helper — no change needed. The backend MP-009 plan ensures all endpoints now return ProblemDetails bodies (not empty 404s), but the frontend already handles both cases (the existing `ApiError` includes the parsed body or `null` on JSON parse failure). | | |

## 3. Alternatives

- **ALT-001: Navigate to `/404` route instead of rendering `NotFoundPage` inline** — Would use `navigate('/404')` on 404 errors instead of rendering the component in-place. Rejected because the frontend instructions §3 specify "If the backend returns 404 for a slug or token, render the `NotFoundPage` inline (do not navigate away)." The current approach is correct.
- **ALT-002: Show different messages for "poll not found" vs. "invalid management token"** — Would require passing a prop or context to `NotFoundPage`. Rejected because: (a) the PRD acceptance criteria use the same message ("Poll not found") for both scenarios; (b) the component is simpler without conditional messaging; (c) the management link is private and "Poll not found" is intentionally vague for security.
- **ALT-003: Add an illustration/icon (e.g., SVG 404 graphic) to `NotFoundPage`** — Would make the page more visually appealing. Rejected because the instructions state "Keep the UI fast and minimal" (frontend instructions §13) and no new assets are approved. Can be revisited in a polish pass.

## 4. Dependencies

- **DEP-001**: No new npm packages required. `react-router-dom` `Link` component is already available.
- **DEP-002**: The backend MP-009 changes (consistent ProblemDetails 404 responses) are complementary but not blocking. The frontend already handles 404 responses correctly via `ApiError.status === 404` checks in each page, regardless of whether the body contains ProblemDetails or is empty.
- **DEP-003**: All existing test dependencies (Vitest, React Testing Library, Playwright) are already installed and configured.

## 5. Files

- **FILE-001**: `frontend/src/pages/NotFoundPage.tsx` — replace stub with fully styled 404 page content.
- **FILE-002**: `frontend/tests/pages/NotFoundPage.test.tsx` — new test file for the `NotFoundPage` component.
- **FILE-003**: `frontend/tests/pages/VotePage.test.tsx` — update two 404 test cases with positive assertions.
- **FILE-004**: `frontend/tests/pages/ResultsPage.test.tsx` — update one 404 test case with positive assertions.
- **FILE-005**: `frontend/tests/pages/ManagePage.test.tsx` — update one 404 test case with positive assertions.
- **FILE-006**: `frontend/e2e/vote.spec.ts` — update one 404 test case with positive assertions.
- **FILE-007**: `frontend/e2e/results.spec.ts` — update one 404 test case with positive assertions.
- **FILE-008**: `frontend/e2e/manage.spec.ts` — update one 404 test case with positive assertions.
- **FILE-009**: `frontend/e2e/not-found.spec.ts` — new E2E spec for the catch-all `*` route 404 page.

## 6. Testing

- **TEST-001**: `NotFoundPage.test.tsx` — renders heading "Poll not found", renders descriptive text, renders link to home page with `href="/"`.
- **TEST-002**: `VotePage.test.tsx` — 404 from `getPollBySlug` renders "Poll not found" heading and home link; 404 from `castVote` renders "Poll not found" heading.
- **TEST-003**: `ResultsPage.test.tsx` — 404 from `getResults` renders "Poll not found" heading and home link.
- **TEST-004**: `ManagePage.test.tsx` — 404 from `getPollByManagementToken` renders "Poll not found" heading and home link.
- **TEST-005**: `vote.spec.ts` E2E — "Poll not found" heading and home link visible on 404 from `getPollBySlug`.
- **TEST-006**: `results.spec.ts` E2E — "Poll not found" heading and home link visible on 404 from `getResults`.
- **TEST-007**: `manage.spec.ts` E2E — "Poll not found" heading and home link visible on 404 from `getPollByManagementToken`.
- **TEST-008**: `not-found.spec.ts` E2E — navigating to unknown URL shows "Poll not found" heading, home link visible and functional.
- **TEST-009**: Run full test suites: `npm test` for Vitest, `npm run test:e2e` for Playwright. Build with `npm run build` to catch TypeScript errors.

## 7. Risks & Assumptions

- **RISK-001**: Existing E2E tests assert `not.toBeVisible()` for specific headings that were never rendered (because `NotFoundPage` was a stub `<div />`). After the change, the "Poll not found" heading will appear — these tests should still pass since we're replacing negative assertions with positive ones. However, any E2E test that was accidentally relying on the page being completely empty will break.
- **ASSUMPTION-001**: The heading text will be exactly "Poll not found" (used in assertions). If a different wording is chosen during implementation, all test assertions must be updated to match.
- **ASSUMPTION-002**: The link text will be "Create a new poll" (or similar CTA). The exact text must be consistent across the component and all tests.
- **ASSUMPTION-003**: `NotFoundPage` does not need to distinguish between "poll not found" (API 404) and "page not found" (unknown route). The same friendly message is appropriate for both — the PRD only requires "Poll not found" messaging and the catch-all route serves the same purpose.

## 8. Related Specifications / Further Reading

- [PRD — MP-009: Handle invalid poll links](../PRD.md)
- [Frontend instructions](../../.github/instructions/frontend.instructions.md) — §3 Routing (catch-all route), §4.3 Error Handling (404 → NotFoundPage), §5.6 NotFoundPage spec
- [MP-009 Backend plan](./MP-009-Backend.md) — complementary backend changes for consistent ProblemDetails 404 responses
