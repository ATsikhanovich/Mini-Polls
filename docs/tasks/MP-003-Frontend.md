# MP-003 Frontend — Vote on a Poll

## TL;DR

Implement the full voting flow: the **VotePage** (`/p/:slug`) loads a poll by slug, checks for duplicate votes, renders radio-button options, and submits a vote; the **ResultsPage** (`/p/:slug/results`) fetches aggregated results and displays them with progress bars, vote counts, percentages, and a total. Four new API functions are added to `src/api/polls.ts` (`getPollBySlug`, `castVote`, `checkVote`, `getResults`). The `ProgressBar` and `StatusBadge` shared components are implemented. TypeScript types in `src/types/poll.ts` are updated to match the backend DTOs defined in MP-003-Backend. A new utility `derivePollStatus` is added to compute display status from `isClosed` + `expiresAt`. Unit/component tests cover both pages, the two new components, and the four new API functions. E2E tests cover the voting and results user flows.

---

## Steps

### 1. Update TypeScript types — `src/types/poll.ts`

Align existing interfaces with the backend DTOs from MP-003-Backend. The instruction in the frontend conventions states: "Adjust field names to match the actual backend API response DTOs."

- **`Poll`**: Remove `closedAt: string | null` and `status: 'active' | 'closed' | 'expired'`. Add `isClosed: boolean`. Keep `id`, `question`, `slug`, `expiresAt`, `createdAt`, `options`.
- **`PollOption`**: No changes (already matches backend `PollOptionDto`).
- **`PollResults`**: Remove `pollId: string` and `status: 'active' | 'closed' | 'expired'`. Add `isClosed: boolean`. Keep `question`, `totalVotes`, `options`.
- **`OptionResult`**: Rename `optionId: string` to `id: string`. Keep `text`, `voteCount`, `percentage`.
- **Add `CastVoteResponse`**: New interface with `voteId: string`, `pollOptionId: string`, `castAt: string` (matches backend `CastVoteResult`).
- **`CastVoteRequest`**, **`VoteCheckResponse`**, **`CreatePollRequest`**, **`CreatePollResponse`**, **`SetExpirationRequest`**: No changes needed.

### 2. Add utility — `src/utils/derivePollStatus.ts`

New file. Named export `derivePollStatus`.

- Signature: `derivePollStatus(isClosed: boolean, expiresAt: string | null): 'active' | 'closed' | 'expired'`.
- Logic: if `isClosed` is true and `expiresAt` is non-null and `new Date(expiresAt) <= new Date()`, return `'expired'`. Else if `isClosed` is true, return `'closed'`. Otherwise return `'active'`.
- This utility is used by VotePage (which has both fields from `PollDto`) and by ResultsPage (which can pass `null` for `expiresAt` and get `'active'` or `'closed'`).

### 3. Add API functions — `src/api/polls.ts`

Add four new named exports below the existing `createPoll` function. Remove the corresponding placeholder comments. Import `Poll`, `CastVoteRequest`, `CastVoteResponse`, `VoteCheckResponse`, `PollResults` from `../types/poll`.

**3a. `getPollBySlug`**

- Signature: `getPollBySlug(slug: string): Promise<Poll>`.
- Implementation: `` return request<Poll>(`/polls/by-slug/${slug}`) ``.
- On 404, the existing `request` helper throws `ApiError`; the page component handles routing to NotFoundPage.

**3b. `castVote`**

- Signature: `castVote(slug: string, data: CastVoteRequest): Promise<CastVoteResponse>`.
- Implementation: `` return request<CastVoteResponse>(`/polls/${slug}/votes`, { method: 'POST', body: JSON.stringify(data) }) ``.
- The caller handles `ApiError` with status 409 (duplicate), 410 (closed), 404 (not found).

**3c. `checkVote`**

- Signature: `checkVote(slug: string): Promise<VoteCheckResponse>`.
- Implementation: `` return request<VoteCheckResponse>(`/polls/${slug}/vote-check`) ``.

**3d. `getResults`**

- Signature: `getResults(slug: string): Promise<PollResults>`.
- Implementation: `` return request<PollResults>(`/polls/${slug}/results`) ``.

### 4. Implement `ProgressBar` — `src/components/ProgressBar.tsx`

Replace the current stub. Named export `ProgressBar`.

- **Props**: `{ percentage: number; label?: string }`.
- **Rendering**: An outer container `<div>` with `bg-[var(--color-progress-bg)] rounded-full h-6 overflow-hidden relative`. Inside, a fill `<div>` with `bg-[var(--color-progress-fill)] h-full rounded-full transition-all duration-300` and inline style `width` set to `Math.min(Math.max(percentage, 0), 100)` percent (clamped 0–100). Overlaid on the bar, a `<span>` with the label text (if provided) left-aligned inside the bar, and the formatted percentage value right-aligned or at the end of the fill. Format the percentage as `percentage.toFixed(1).replace(/\.0$/, '') + '%'`.
- Use `role="progressbar"` with `aria-valuenow={percentage}`, `aria-valuemin={0}`, `aria-valuemax={100}` for accessibility.

### 5. Implement `StatusBadge` — `src/components/StatusBadge.tsx`

Replace the current stub. Named export `StatusBadge`.

- **Props**: `{ status: 'active' | 'closed' | 'expired' }`.
- **Rendering**: A `<span>` pill badge. Apply `text-xs font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-full inline-block`. Colour by status:
  - `'active'` → `bg-[var(--color-status-active)]/20 text-[var(--color-status-active)]`, display text "Active".
  - `'closed'` → `bg-[var(--color-status-closed)]/20 text-[var(--color-status-closed)]`, display text "Closed".
  - `'expired'` → `bg-[var(--color-status-expired)]/20 text-[var(--color-status-expired)]`, display text "Expired".

### 6. Implement `VotePage` — `src/pages/VotePage.tsx`

Replace the current stub. Default export `VotePage`.

**Imports**: `useState`, `useEffect` from React; `useParams`, `useNavigate` from `react-router-dom`; `getPollBySlug`, `castVote`, `checkVote`, `ApiError` from `../api/polls`; `ErrorMessage` from `../components/ErrorMessage`; `StatusBadge` from `../components/StatusBadge`; `derivePollStatus` from `../utils/derivePollStatus`; `Poll` from `../types/poll`; `NotFoundPage` from `./NotFoundPage`.

**Local state**:

- `poll: Poll | null` — loaded poll data.
- `selectedOptionId: string | null` — the option the user has selected via radio button.
- `loading: boolean` — true during initial fetch.
- `submitting: boolean` — true while the vote POST is in flight.
- `error: string | null` — generic error text.
- `notFound: boolean` — true when API returns 404.

**On mount** (`useEffect` with `[slug, navigate]` dependency):

1. Set `loading = true`, `error = null`, `notFound = false`.
2. Call `getPollBySlug(slug!)`.
   - On `ApiError` with status 404 → set `notFound = true`, set `loading = false`, return.
   - On other error → set `error = 'Something went wrong. Please try again.'`, set `loading = false`, return.
3. Check if the poll is closed (`poll.isClosed`) → navigate to `/p/${slug}/results` with `{ replace: true }` and return.
4. Call `checkVote(slug!)`.
   - If response `hasVoted` is true → navigate to `/p/${slug}/results` with `{ replace: true }` and return.
   - On error → proceed without redirecting (graceful degradation; the backend will reject the vote if duplicate).
5. Store the poll in state, set `loading = false`.

**Vote submission handler** (`handleVote`):

1. Guard: return if `selectedOptionId` is null.
2. Set `submitting = true`, `error = null`.
3. Call `castVote(slug!, { optionId: selectedOptionId })`.
   - On success → navigate to `/p/${slug}/results`.
   - On `ApiError` 409 → navigate to `/p/${slug}/results` (duplicate vote; show results).
   - On `ApiError` 410 → navigate to `/p/${slug}/results` (poll closed; show results).
   - On `ApiError` 404 → set `notFound = true`.
   - On other error → set `error = 'Something went wrong. Please try again.'`.
4. Set `submitting = false` in `finally`.

**Rendering**:

- If `loading` → render a centered "Loading…" text.
- If `notFound` → render `<NotFoundPage />` inline (the component is imported and rendered directly, not navigated to).
- If `error` → render `<ErrorMessage message={error} />`.
- Otherwise → render:
  - `<h1>` with `poll.question`, styled `text-2xl font-bold text-[#f8f8f8] mb-6 tracking-tight` (matching `CreatePollPage` heading style).
  - A `<form>` with `onSubmit` calling `handleVote`. `noValidate` attribute set.
  - A list of option cards. Each option is a `<label>` wrapping a hidden `<input type="radio" name="vote" value={option.id}>` and the option text. Each label is styled as a clickable card: `flex items-center gap-3 border border-white/10 rounded-[var(--radius-card)] p-4 cursor-pointer hover:border-primary-500/50 transition`. When selected (`selectedOptionId === option.id`), apply `border-primary-500 bg-primary-500/10`. Use `aria-label` or visible text for accessibility. Include a visual radio indicator (a styled circle that fills when selected).
  - A "Vote" `<button type="submit">` styled like the "Create" button in `CreatePollPage`: `bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-[var(--radius-btn)] px-5 py-2 text-sm tracking-wide disabled:opacity-50 disabled:cursor-not-allowed transition`. Disabled when `selectedOptionId` is null or `submitting` is true. Label: `submitting ? 'Voting…' : 'Vote'`.
  - Below the button, `<ErrorMessage message={error} />` for submission errors.

### 7. Implement `ResultsPage` — `src/pages/ResultsPage.tsx`

Replace the current stub. Default export `ResultsPage`.

**Imports**: `useState`, `useEffect` from React; `useParams` from `react-router-dom`; `getResults`, `ApiError` from `../api/polls`; `ProgressBar` from `../components/ProgressBar`; `StatusBadge` from `../components/StatusBadge`; `ErrorMessage` from `../components/ErrorMessage`; `PollResults` from `../types/poll`; `NotFoundPage` from `./NotFoundPage`.

**Local state**:

- `results: PollResults | null` — loaded results.
- `loading: boolean`.
- `error: string | null`.
- `notFound: boolean`.

**On mount** (`useEffect` with `[slug]` dependency):

1. Set `loading = true`, `error = null`, `notFound = false`.
2. Call `getResults(slug!)`.
   - On success → store in state.
   - On `ApiError` 404 → set `notFound = true`.
   - On other error → set `error = 'Something went wrong. Please try again.'`.
3. Set `loading = false`.

**Rendering**:

- If `loading` → centered "Loading…" text.
- If `notFound` → `<NotFoundPage />` inline.
- If `error` → `<ErrorMessage message={error} />`.
- Otherwise → render:
  - `<h1>` with `results.question`, same heading style as VotePage.
  - If `results.isClosed`, render `<StatusBadge status="closed" />` next to or below the heading. (Since `PollResultsDto` lacks `expiresAt`, the status is always `'closed'` for any closed poll — see Decisions section.)
  - A `<p>` showing total votes: e.g., `"${results.totalVotes} vote${results.totalVotes !== 1 ? 's' : ''} total"`, styled `text-sm text-white/60 mb-4`.
  - For each option in `results.options`, render a block containing:
    - Option text as a `<p>` with `font-medium text-[#f8f8f8]`.
    - Vote count and percentage: `<span>` with `text-sm text-white/60`, e.g., `"3 votes · 42.9%"`.
    - `<ProgressBar percentage={option.percentage} />`.
  - Options are rendered in array order (backend sorts by `SortOrder`).
  - Wrap each option block in a `<div>` with `mb-4` spacing.

### 8. Routing — `src/App.tsx`

No changes needed. Routes for `/p/:slug` → `VotePage` and `/p/:slug/results` → `ResultsPage` are already defined.

### 9. State management — `src/stores/pollStore.ts`

No changes needed. VotePage and ResultsPage use local `useState` per the frontend instructions ("Local component state is preferred for page-level data fetching results").

---

## Test Plan

### 10. API function tests — `tests/api/polls.test.ts`

Add new `describe` blocks for each new API function, following the established pattern in the existing `createPoll` tests (mock `fetch` via `vi.stubGlobal`, restore in `afterEach`).

**`getPollBySlug`**:
- Sends GET to `/polls/by-slug/{slug}` with `Content-Type: application/json` header.
- Returns parsed `Poll` on 200.
- Throws `ApiError` with status 404 when poll not found.
- Throws on network failure.

**`castVote`**:
- Sends POST to `/polls/{slug}/votes` with JSON body containing `optionId`.
- Returns `CastVoteResponse` on 200.
- Throws `ApiError` with status 409 on duplicate vote.
- Throws `ApiError` with status 410 on closed poll.
- Throws `ApiError` with status 404 on unknown slug.

**`checkVote`**:
- Sends GET to `/polls/{slug}/vote-check`.
- Returns `{ hasVoted: true }` or `{ hasVoted: false }`.

**`getResults`**:
- Sends GET to `/polls/{slug}/results`.
- Returns parsed `PollResults` on 200.
- Throws `ApiError` with status 404 when poll not found.

### 11. `ProgressBar` tests — `tests/components/ProgressBar.test.tsx`

New file. Test cases:

- Renders a progressbar role element.
- Fill bar has `width: 0%` style when `percentage` is 0.
- Fill bar has `width: 50%` style when `percentage` is 50.
- Fill bar has `width: 100%` style when `percentage` is 100.
- Clamps percentage above 100 to 100% width.
- Clamps negative percentage to 0% width.
- Displays the formatted percentage text (e.g., "42.9%").
- Displays label text when `label` prop is provided.
- Has correct `aria-valuenow` attribute matching the percentage.

### 12. `StatusBadge` tests — `tests/components/StatusBadge.test.tsx`

New file. Test cases:

- Renders "Active" text when `status` is `'active'`.
- Renders "Closed" text when `status` is `'closed'`.
- Renders "Expired" text when `status` is `'expired'`.
- Each status applies distinct CSS classes (verify the class name differs for each status).

### 13. `derivePollStatus` tests — `tests/utils/derivePollStatus.test.ts`

New file. Test cases:

- Returns `'active'` when `isClosed` is false and `expiresAt` is null.
- Returns `'active'` when `isClosed` is false and `expiresAt` is in the future.
- Returns `'closed'` when `isClosed` is true and `expiresAt` is null.
- Returns `'closed'` when `isClosed` is true and `expiresAt` is in the future (manually closed before expiration).
- Returns `'expired'` when `isClosed` is true and `expiresAt` is in the past.

### 14. `VotePage` tests — `tests/pages/VotePage.test.tsx`

New file. Mock `../../src/api/polls` via `vi.mock`. Mock `react-router-dom` `useNavigate` (return `mockNavigate`) and `useParams` (return `{ slug: 'test1' }`). Render inside `<MemoryRouter>`.

Test cases:

- Shows "Loading…" text while API calls are in flight.
- Renders poll question as a heading and all options as radio-labelled elements after loading.
- "Vote" button is disabled when no option is selected.
- Selecting an option enables the "Vote" button.
- Clicking "Vote" calls `castVote` with the correct slug and selected option ID.
- On successful vote, navigates to `/p/test1/results`.
- Button shows "Voting…" and is disabled while submission is in progress.
- Navigates to `/p/test1/results` with `replace: true` when `checkVote` returns `hasVoted: true`.
- Navigates to `/p/test1/results` with `replace: true` when poll `isClosed` is true.
- Renders `NotFoundPage` content when `getPollBySlug` throws `ApiError(404)`.
- Shows generic error message when `getPollBySlug` throws a network error.
- Navigates to results on `ApiError(409)` during vote submission (duplicate vote).
- Navigates to results on `ApiError(410)` during vote submission (poll closed).
- Sets `notFound` on `ApiError(404)` during vote submission.

### 15. `ResultsPage` tests — `tests/pages/ResultsPage.test.tsx`

New file. Mock `../../src/api/polls` via `vi.mock`. Mock `useParams` to return `{ slug: 'test1' }`. Render inside `<MemoryRouter>`.

Test cases:

- Shows "Loading…" while fetching results.
- Renders the poll question as a heading.
- Displays total vote count text.
- Renders each option with its text, vote count, and percentage.
- Renders a `ProgressBar` for each option (verify progressbar roles are present).
- Shows a `StatusBadge` with "Closed" text when `isClosed` is true.
- Does not show a `StatusBadge` when `isClosed` is false.
- Renders `NotFoundPage` content when `getResults` throws `ApiError(404)`.
- Shows generic error message on network failure.

### 16. E2E test — `e2e/vote.spec.ts`

New file. All API calls mocked via `page.route()`. No live backend.

**Helpers** (at top of file):

- `mockGetPollBySlug(page, poll)` — intercepts `GET **/api/polls/by-slug/*` and fulfills with the given poll object.
- `mockCheckVoteNotVoted(page)` — intercepts `GET **/api/polls/*/vote-check` and fulfills with `{ hasVoted: false }`.
- `mockCheckVoteAlreadyVoted(page)` — intercepts `GET **/api/polls/*/vote-check` and fulfills with `{ hasVoted: true }`.
- `mockCastVoteSuccess(page)` — intercepts `POST **/api/polls/*/votes` and fulfills with a `CastVoteResponse`.
- `mockGetResults(page, results)` — intercepts `GET **/api/polls/*/results` and fulfills with the given results.

**Test cases** (inside `test.describe('Vote page')`):

- `test.beforeEach`: navigate to `/p/test1`.
- Displays the poll question and all options.
- "Vote" button is disabled when no option is selected.
- Selecting an option makes it visually highlighted and enables the "Vote" button.
- Clicking "Vote" sends a POST with the correct `optionId` in the body (capture via route handler).
- After a successful vote, navigates to `/p/test1/results`.
- Button shows "Voting…" while request is in flight (delay the mock response).
- Redirects to results when `vote-check` returns `hasVoted: true`.
- Redirects to results when poll `isClosed` is true.
- Shows "Poll not found" content for a 404 from `getPollBySlug`.
- Shows generic error on network failure (use `route.abort('failed')`).
- Navigates to results on 409 from `castVote`.

### 17. E2E test — `e2e/results.spec.ts`

New file. All API calls mocked via `page.route()`.

**Helpers**:

- `mockGetResults(page, results)` — intercepts `GET **/api/polls/*/results`.
- A default results fixture with 2–3 options, known vote counts and percentages.

**Test cases** (inside `test.describe('Results page')`):

- `test.beforeEach`: navigate to `/p/test1/results`.
- Displays the poll question heading.
- Shows total vote count.
- Displays each option with its vote count and percentage text.
- Renders progress bars for each option (verify `progressbar` role elements).
- Shows "Closed" badge when `isClosed` is true in the mock.
- Does not show a status badge when `isClosed` is false.
- Shows "Poll not found" content for a 404.
- Shows generic error on network failure.

---

## Verification

- `npm run typecheck` from `frontend/` — zero errors.
- `npm run build` from `frontend/` — successful build.
- `npm test` from `frontend/` — all existing tests pass plus all new tests for API functions, components (`ProgressBar`, `StatusBadge`), utility (`derivePollStatus`), and pages (`VotePage`, `ResultsPage`) pass.
- `npm run test:e2e` from `frontend/` — all existing E2E tests pass plus new `vote.spec.ts` and `results.spec.ts` pass.
- Manual: start frontend (`npm run dev`) and backend (`dotnet run`). Create a poll. Open the voting link in the browser. Verify the question and options render. Select an option and click "Vote". Verify navigation to the results page with correct counts and a progress bar. Revisit the voting link — verify redirect to results (duplicate check). Visit a non-existent slug — verify 404 page.

---

## Decisions

- **Types updated to match backend DTOs**: The existing `Poll` and `PollResults` interfaces had placeholder fields (`closedAt`, `status`, `pollId`) that don't match the actual backend response shapes from MP-003-Backend. Updated to use `isClosed: boolean` as the backend returns, and removed absent fields. The type instructions say "Adjust field names to match the actual backend API response DTOs."
- **`derivePollStatus` utility**: The backend returns `isClosed: boolean` but the UI needs to distinguish "closed" vs "expired" for display (PRD § 5.3 and StatusBadge). The `PollDto` includes `expiresAt`, so VotePage can derive the correct status. The `PollResultsDto` does not include `expiresAt`, so ResultsPage defaults to `'closed'` for any closed poll. A separate utility keeps this logic DRY and testable.
- **ResultsPage included in MP-003 scope**: MP-003's acceptance criteria explicitly state "Clicking 'Vote' submits the vote and displays the results page" and "the voter's selection is included in the displayed results." The ResultsPage must exist for the voting flow to work end-to-end. MP-004 ("View results after voting") largely overlaps; any MP-004-specific polish (e.g., highlighting the voter's own selection) can build on top of this implementation.
- **ProgressBar and StatusBadge included**: Both components are required by the ResultsPage, which is part of the voting flow. They are currently stubs that return `<div />`.
- **`formatPercent` not reused for results display**: The existing `formatPercent` utility expects a 0–1 decimal fraction, but the backend `PollResultsDto` returns percentages in the 0–100 range. Rather than dividing by 100 to accommodate the existing utility, the ProgressBar and ResultsPage format the backend percentage value directly. This avoids confusion and matches the backend contract.
- **No Zustand store changes**: Both pages use local `useState` for fetched data, per frontend instructions § 6 ("Local component state is preferred for form inputs and page-level data fetching results").
- **NotFoundPage rendered inline**: When the API returns 404, VotePage and ResultsPage render the `NotFoundPage` component directly rather than navigating to a catch-all route. This matches the frontend instructions § 3 route rules: "If the backend returns 404 for a slug or token, render the NotFoundPage inline (do not navigate away)."
- **Graceful degradation on vote-check failure**: If the `checkVote` call fails (e.g., network error), VotePage proceeds to show the form rather than blocking the user. The backend will still reject duplicate votes, so correctness is preserved. This avoids a blank/error screen for a non-critical preflight check.
- **Radio-button option cards**: Options are rendered as styled card `<label>` elements wrapping hidden radio inputs, consistent with the dark-theme card styling used in `PollCreatedPage` link sections. This gives a larger click target and better mobile UX than bare radio buttons.
