---
goal: Implement frontend for MP-008 — Set poll expiration
version: 1.0
date_created: 2026-02-27
date_completed: 2026-02-27
status: 'Completed'
tags: feature, frontend, management, creation, expiration
---

# MP-008 Frontend — Set Poll Expiration

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

Implement the poll expiration feature across two pages. On `CreatePollPage`, add an optional date/time picker so the creator can set an expiration at creation time. On `ManagePage`, add a date/time picker so the creator can set or update the expiration for an active poll. The backend `PUT /api/polls/{token}/expiration` endpoint is planned in [MP-008-Backend.md](MP-008-Backend.md). On the frontend this requires: a new `SetExpirationResponse` type (the `SetExpirationRequest` type already exists), a new `setPollExpiration` API function, modifications to both `CreatePollPage` (add expiration picker + validation) and `ManagePage` (add expiration picker + save button + error handling), plus corresponding unit tests and E2E tests. The `StatusBadge`, `derivePollStatus`, and all results pages already handle the "expired" state correctly, and the `ManagementPoll` and `Poll` types already include `expiresAt` — no changes needed there.

## 1. Requirements & Constraints

- **REQ-001**: During poll creation, the creator can optionally set an expiration date/time — per MP-008 acceptance criteria and frontend instructions §5.1 which specifies "An optional expiration date/time picker."
- **REQ-002**: On the management page, the creator can set or update the expiration date/time for an active poll — per MP-008 acceptance criteria and frontend instructions §5.5 which specifies "Set/update expiration: a date/time picker with a Save button."
- **REQ-003**: The expiration date/time must be in the future — validated client-side before submission, and enforced server-side.
- **REQ-004**: When the expiration time is reached, the poll is automatically marked as closed — already handled: `Poll.isClosed` and `derivePollStatus` already detect expiration; `VotePage` redirects closed polls to results; `ResultsPage` and `ManagePage` show the appropriate `StatusBadge`.
- **REQ-005**: Voters visiting an expired poll see the final results and a "Poll expired" notice — already handled by `VotePage` (redirect when `isClosed`), `ResultsPage` (badge), and `StatusBadge` ("Expired" variant).
- **REQ-006**: The expiration picker should not appear for closed/expired polls on the management page — only active polls show management actions per existing pattern.
- **REQ-007**: After setting/updating expiration on the management page, the displayed data must refresh to reflect the change.
- **CON-001**: No new dependencies. Use native `<input type="datetime-local">` for the date/time picker — no external date picker library.
- **CON-002**: API functions are pure HTTP helpers — no React state inside `api/polls.ts`.
- **CON-003**: Local `useState` for expiration form state (value, loading, error) — no Zustand store needed.
- **PAT-001**: Follow API function pattern from `closePoll` — PUT with JSON body, token in URL.
- **PAT-002**: Follow API test pattern from `polls.test.ts` — mock fetch, verify URL/method/body, test success and error cases.
- **PAT-003**: Follow page test pattern from `ManagePage.test.tsx` — mock API module, use RTL, simulate user interactions.
- **PAT-004**: Follow E2E test pattern from `manage.spec.ts` — mock API via `page.route()`, use ARIA selectors.
- **GUD-001**: Use file-scoped `function` declarations for components, `const` + arrow for helpers. No `any` types.
- **GUD-002**: Keep `ManagePage` under ~150 lines. If adding the expiration section pushes it significantly over, extract the expiration form into a local sub-component or a co-located file.

## 2. Implementation Steps

### Phase 1 — TypeScript Types

- GOAL-001: Add the `SetExpirationResponse` type to complete the API contract. The `SetExpirationRequest` already exists.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | **Add `SetExpirationResponse` interface** to `frontend/src/types/poll.ts`. Properties: `id: string`, `expiresAt: string | null` (ISO 8601). This mirrors the backend `SetPollExpirationResult` DTO. Export the interface. Place it adjacent to the existing `SetExpirationRequest` interface. | | |

### Phase 2 — API Function

- GOAL-002: Add the `setPollExpiration` function to the API client.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-002 | **Add `setPollExpiration` function** to `frontend/src/api/polls.ts`. Signature: `export function setPollExpiration(token: string, data: SetExpirationRequest): Promise<SetExpirationResponse>`. Implementation: call `request<SetExpirationResponse>(`/polls/${token}/expiration`, { method: 'PUT', body: JSON.stringify(data) })`. Import `SetExpirationRequest` and `SetExpirationResponse` from `../types/poll`. Add a JSDoc comment `/** PUT /api/polls/{token}/expiration — Set or update poll expiration */`. | | |

### Phase 3 — CreatePollPage: Add Optional Expiration Picker

- GOAL-003: Add an optional expiration date/time picker to the poll creation form, per frontend instructions §5.1.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-003 | **Add `expiresAt` state** to `CreatePollPage`. Add `const [expiresAt, setExpiresAt] = useState<string>('')` — an empty string means no expiration set. This stores the `datetime-local` input value in the format `YYYY-MM-DDTHH:mm`. | | |
| TASK-004 | **Add expiration validation** to `handleSubmit` in `CreatePollPage`. Extend the `FormErrors` interface with `expiresAt?: string`. In the validation block, if `expiresAt` is non-empty and `new Date(expiresAt) <= new Date()`, set `newErrors.expiresAt = 'Expiration date must be in the future'`. | | |
| TASK-005 | **Include `expiresAt` in the API call body** in `handleSubmit`. When building the `createPoll` payload, add `expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined`. If `expiresAt` is empty, pass `undefined` (omit it from the request). The `CreatePollRequest` type already supports `expiresAt?: string | null`. | | |
| TASK-006 | **Render the expiration picker** in the JSX, placed between the options section and the submit button. Render a `<div className="mb-4">` containing: (a) a label `<p>` reading "Expiration (optional)" with `text-sm font-semibold text-white/60 uppercase tracking-wider mb-3` styling (matching the "Options" label); (b) an `<input type="datetime-local" aria-label="Expiration date" value={expiresAt} onChange={...} />` styled consistently with other inputs (`bg-[#2a2a2a] border border-white/10 rounded-[var(--radius-input)] px-3 py-2 text-[#f8f8f8] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition`), with a `min` attribute set to the current date/time (to prevent selecting past dates in browsers that support it); (c) an `<ErrorMessage message={errors.expiresAt} />` below for validation errors. Also add the `colorScheme: 'dark'` inline style or the Tailwind `dark:color-scheme-dark` class so the native picker respects the dark theme. | | |
| TASK-007 | **Handle 400 errors for `ExpiresAt`** in the catch block of `handleSubmit`. When parsing the `ProblemDetails` error body, check `errorsMap['ExpiresAt']` and map it to `mapped.expiresAt`. This handles server-side validation errors for the expiration field (e.g., past date that slipped past client-side validation). | | |

### Phase 4 — ManagePage: Add Expiration Picker

- GOAL-004: Add a set/update expiration form to the management page for active polls.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-008 | **Add new state variables** to `ManagePage` for the expiration form: `expirationInput: string` (the datetime-local input value, initialized from `data.expiresAt` when data loads — convert ISO string to `datetime-local` format `YYYY-MM-DDTHH:mm` using slice or a helper, or empty string if null), `savingExpiration: boolean` (tracks in-flight save request, initialized to `false`), `expirationError: string | null` (holds error message if save fails, initialized to `null`), `expirationSuccess: string | null` (brief success message, initialized to `null`). | | |
| TASK-009 | **Initialize `expirationInput` from loaded data**. In the `useEffect` that fetches poll data, after `setData(response)`, also set `expirationInput` to the formatted value of `response.expiresAt` if non-null, or empty string otherwise. To convert ISO 8601 to `datetime-local` format, use `response.expiresAt ? response.expiresAt.slice(0, 16) : ''` — this extracts `YYYY-MM-DDTHH:mm` from the ISO string. Alternatively, create a small utility function `toDateTimeLocalValue(iso: string | null): string` if reuse is desired. | | |
| TASK-010 | **Add `handleSetExpiration` async function** inside `ManagePage`. Logic: (1) validate that `expirationInput` is non-empty and `new Date(expirationInput) > new Date()` — if not, set `expirationError` to `'Expiration date must be in the future.'` and return; (2) set `savingExpiration` to `true`, `expirationError` to `null`, `expirationSuccess` to `null`; (3) call `setPollExpiration(token!, { expiresAt: new Date(expirationInput).toISOString() })` from the API module; (4) on success, re-fetch the full poll data by calling `getPollByManagementToken(token!)` and update the `data` state — this ensures `expiresAt` and `isClosed` are in sync; (5) set `expirationSuccess` to `'Expiration updated.'` and clear it after 3 seconds with `setTimeout`; (6) on error, if `ApiError` with status 400, parse `ProblemDetails` and set `expirationError` to the detail message (or a default `'Failed to set expiration.'`); for other errors set `expirationError` to `'Failed to set expiration. Please try again.'`; (7) set `savingExpiration` to `false` in a `finally` block. Import `setPollExpiration` from `../api/polls`. | | |
| TASK-011 | **Render the expiration form section** in the JSX, inside the existing `{status === 'active' && (...)}` block, as a separate bordered card placed above or below the "Close Poll" card (or within the same Actions card). Render a bordered card (`border border-white/10 rounded-lg p-4 mt-4`) containing: (a) a section label `<p>` reading "Set Expiration" with `text-sm font-semibold text-white/60 uppercase tracking-wider mb-3` styling; (b) a `<div className="flex items-center gap-3">` containing the `<input type="datetime-local" aria-label="Expiration date" value={expirationInput} onChange={...} min={...} />` styled consistently with the creation page picker, and a "Save" button (`bg-primary-500 hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-[var(--radius-btn)] transition disabled:opacity-60 disabled:cursor-not-allowed`), `disabled` when `savingExpiration` is true or `expirationInput` is empty, with text "Saving…" while saving; (c) an `<ErrorMessage message={expirationError} />` below; (d) a success message: `{expirationSuccess && <p className="text-green-400 text-sm mt-1">{expirationSuccess}</p>}`. | | |
| TASK-012 | **Display current expiration info**. Above or within the expiration form, if `data.expiresAt` is non-null, display a text line like `Expires: {formattedDate}` (format the date using `new Date(data.expiresAt).toLocaleString()` or similar). This gives the creator immediate visibility of the current expiration regardless of the input state. If no expiration is set, show "No expiration set." This should be visible outside the `status === 'active'` guard — closed and expired polls should also display their expiration date for informational purposes. | | |
| TASK-013 | **Import `setPollExpiration`** from `../api/polls` at the top of `ManagePage.tsx`, alongside the existing imports. Also import `SetExpirationRequest` from `../types/poll` if needed for typing (not strictly necessary since the function parameter is typed). | | |
| TASK-014 | **Check line count**. If `ManagePage` exceeds ~150 lines after these additions, extract the expiration form into a co-located component, e.g., `ExpirationForm` as a function component at the bottom of the same file or in a sibling file `pages/ManagePage/ExpirationForm.tsx`. It would receive props like `token`, `initialExpiresAt`, and an `onExpirationUpdated` callback that triggers re-fetch in the parent. This keeps `ManagePage` lean. | | |

### Phase 5 — API Unit Tests

- GOAL-005: Add unit tests for `setPollExpiration` in the existing API test file.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-015 | **Add `setPollExpiration` to imports** at the top of `frontend/tests/api/polls.test.ts`. | | |
| TASK-016 | **Add `describe('setPollExpiration', ...)` block** to `frontend/tests/api/polls.test.ts`. Define a `setPollExpirationPayload` fixture: `{ id: 'poll-1', expiresAt: '2026-03-15T18:00:00Z' }`. | | |
| TASK-017 | Test: **`sends PUT to /polls/{token}/expiration with JSON body containing expiresAt`** — mock fetch with 200 and the fixture, call `setPollExpiration('my-token', { expiresAt: '2026-03-15T18:00:00Z' })`, assert URL ends with `/polls/my-token/expiration`, method is `PUT`, body is `JSON.stringify({ expiresAt: '2026-03-15T18:00:00Z' })`, and `Content-Type: application/json` header is present. | | |
| TASK-018 | Test: **`returns parsed SetExpirationResponse on 200`** — mock fetch with 200 and fixture, call function, assert result deep-equals the fixture. | | |
| TASK-019 | Test: **`throws ApiError with status 404 when token not found`** — mock fetch with 404, assert rejects with `{ status: 404 }`. | | |
| TASK-020 | Test: **`throws ApiError with status 400 on validation error (past date)`** — mock fetch with 400 and a `ProblemDetails` body, assert rejects with `{ status: 400 }`. | | |
| TASK-021 | Test: **`throws on network failure`** — mock fetch rejecting with `TypeError('Failed to fetch')`, assert rejects with `TypeError`. | | |

### Phase 6 — CreatePollPage Unit Tests

- GOAL-006: Add tests for the new expiration picker on the create poll page.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-022 | Test: **`renders an expiration date input`** — render the page, assert an input with accessible name "Expiration date" (or matching label) is present and visible. | | |
| TASK-023 | Test: **`submits without expiration when picker is empty`** — fill question and options, leave expiration empty, submit. Assert `createPoll` is called with a payload where `expiresAt` is `undefined`. | | |
| TASK-024 | Test: **`submits with expiration when picker is filled with a future date`** — fill question, options, and set the expiration input to a future date. Submit. Assert `createPoll` is called with a payload where `expiresAt` is an ISO 8601 string. | | |
| TASK-025 | Test: **`shows validation error when expiration is in the past`** — fill question, options, set expiration to a past date, submit. Assert an error text matching `/future/i` is visible. Assert `createPoll` was NOT called. | | |
| TASK-026 | Test: **`maps server 400 error for ExpiresAt field to inline error`** — fill valid data, mock `createPoll` to reject with `ApiError(400, { errors: { ExpiresAt: ['Expiration date must be in the future.'] } })`. Submit. Assert the expiration error text is displayed. | | |

### Phase 7 — ManagePage Unit Tests

- GOAL-007: Add tests for the expiration form on the management page.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-027 | **Add `setPollExpiration` to the mock** in `frontend/tests/pages/ManagePage.test.tsx`. Update the `vi.mock('../../src/api/polls', ...)` block to also mock `setPollExpiration: vi.fn()`. Import the mocked function. | | |
| TASK-028 | Test: **`shows expiration form for active poll`** — resolve with active poll fixture, render, assert an input with accessible name "Expiration date" is visible, and a "Save" button is visible. | | |
| TASK-029 | Test: **`does not show expiration form for closed poll`** — resolve with closed poll fixture, render, assert no "Expiration date" input or "Save" button for expiration. | | |
| TASK-030 | Test: **`pre-fills expiration input when poll has an existing expiresAt`** — resolve with a fixture where `expiresAt` is a future ISO date, render, assert the input value is populated (in `YYYY-MM-DDTHH:mm` format). | | |
| TASK-031 | Test: **`shows "No expiration set" when poll has no expiresAt`** — resolve with fixture where `expiresAt` is null, render, assert text matching "No expiration set" is visible. | | |
| TASK-032 | Test: **`shows current expiration date when poll has expiresAt`** — resolve with fixture where `expiresAt` is a non-null ISO date, render, assert the formatted date is visible somewhere in the page. | | |
| TASK-033 | Test: **`clicking Save calls setPollExpiration and refreshes data`** — resolve `getPollByManagementToken` with active poll (no expiry), mock `setPollExpiration` to resolve with success. Simulate: user fills the datetime input with a future date, clicks "Save". Assert `setPollExpiration` was called once with the token and an object containing `expiresAt` as an ISO string. Assert the page re-fetches data (second call to `getPollByManagementToken`). | | |
| TASK-034 | Test: **`shows validation error for empty expiration on Save click`** — resolve with active poll, render, click "Save" without filling the input. Assert error text appears — either "Expiration date must be in the future." or similar. Assert `setPollExpiration` was NOT called. | | |
| TASK-035 | Test: **`shows error message when setPollExpiration fails`** — resolve with active poll, mock `setPollExpiration` to reject with generic error. Simulate user fills input, clicks "Save". Assert error text matching `/failed to set expiration/i` appears. | | |
| TASK-036 | Test: **`disables Save button while request is in progress`** — resolve with active poll, mock `setPollExpiration` to return unresolved promise. Simulate user fills input, clicks "Save". Assert the "Save" button is disabled and shows "Saving…". | | |

### Phase 8 — E2E Tests (Playwright)

- GOAL-008: Add Playwright E2E specs for the expiration feature on both creation and management pages.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-037 | **Add expiration specs to `frontend/e2e/create-poll.spec.ts`**. Add tests within the existing `test.describe('Create Poll page', ...)` or in a nested `test.describe('Expiration picker', ...)` block. | | |
| TASK-038 | E2E Test: **`renders an optional expiration date input`** — navigate to `/`, assert an input with accessible name or label matching "expiration" is visible. | | |
| TASK-039 | E2E Test: **`submits poll without expiration when picker is empty`** — mock `POST /api/polls` success, fill question and options, leave expiration empty, submit. Capture the request body inside the route handler. Assert `expiresAt` is absent or undefined in the submitted body. Assert navigation to `/poll-created`. | | |
| TASK-040 | E2E Test: **`submits poll with expiration when picker is filled`** — mock `POST /api/polls` success, fill question, options, and expiration (use a future date string in `YYYY-MM-DDTHH:mm` format). Submit. Capture the request body. Assert `expiresAt` is a non-null ISO date string in the body. Assert navigation to `/poll-created`. | | |
| TASK-041 | E2E Test: **`shows validation error when expiration is in the past`** — fill question, options, and set expiration to a past date. Submit. Assert error text matching "future" is visible. Assert no API call was made. | | |
| TASK-042 | **Add expiration specs to `frontend/e2e/manage.spec.ts`**. Add within the existing describe block or a nested `test.describe('Set expiration', ...)` block. Define a `mockSetExpiration` helper that intercepts `PUT **/api/polls/*/expiration` and fulfills with `{ id: 'poll-1', expiresAt: '<future ISO>' }`. | | |
| TASK-043 | E2E Test: **`shows expiration form for active poll`** — mock API with active poll, navigate to `/manage/test-token`, assert "Expiration date" input and "Save" button are visible. | | |
| TASK-044 | E2E Test: **`does not show expiration form for closed poll`** — mock API with closed poll, navigate, assert expiration input is not visible. | | |
| TASK-045 | E2E Test: **`setting expiration updates the displayed data`** — mock API with active poll (no expiry), mock the set-expiration endpoint, mock the subsequent management token fetch to return poll with the new `expiresAt`. Fill expiration input with a future date, click "Save". Assert the page now shows the expiration date text. | | |
| TASK-046 | E2E Test: **`shows error when set-expiration fails`** — mock API with active poll, mock set-expiration endpoint to return 500. Fill input, click "Save". Assert error text matching `/failed/i` is visible. | | |

## 3. Alternatives

- **ALT-001: Use a third-party date picker component (e.g., react-datepicker)** — Would provide a more polished, cross-browser-consistent experience. Rejected because frontend instructions §1 prohibit adding libraries beyond the approved stack. The native `<input type="datetime-local">` is sufficient for a hobby project and works in all modern browsers.
- **ALT-002: Use a Zustand store slice for the expiration form state on ManagePage** — The expiration input, loading, and error are only needed within ManagePage. Local `useState` is preferred per frontend instructions §6: "Use Zustand only when state needs to be shared across components that are not in a direct parent-child relationship."
- **ALT-003: Allow clearing the expiration (setting it to null) from the management page** — The PRD says "set or update" but not "clear." The backend endpoint does not support clearing. If needed later, a "Clear expiration" button with a separate API call can be added. For now, the picker only allows setting/updating to a future date.
- **ALT-004: Use `onChange` on the expiration input to validate in real-time** — Real-time validation provides immediate feedback but can be annoying if the user is still typing. Opted for validate-on-submit, consistent with how the question and options are validated on `CreatePollPage`.
- **ALT-005: Optimistically update `data.expiresAt` locally after a successful save, instead of re-fetching** — Rejected because re-fetching is the established pattern (used for close-poll) and ensures all data (including concurrent vote changes) is fresh. The extra GET is cheap.

## 4. Dependencies

- **DEP-001**: No new npm packages required. The native `<input type="datetime-local">` HTML element is used.
- **DEP-002**: Depends on backend `PUT /api/polls/{token}/expiration` endpoint — see [MP-008-Backend.md](MP-008-Backend.md).
- **DEP-003**: Depends on backend `POST /api/polls` already supporting `expiresAt` in the creation request — this is already implemented (the `CreatePollCommand` accepts `ExpiresAt`).
- **DEP-004**: Existing `ManagePage` implementation from MP-006/MP-007 — the page must already be rendering poll data, status badge, close button, and voting link.
- **DEP-005**: Existing shared components (`StatusBadge`, `ErrorMessage`, `CopyButton`, `ProgressBar`) — no changes needed.
- **DEP-006**: Existing `derivePollStatus` utility — no changes needed (already handles expired state).
- **DEP-007**: Existing `request` helper in `api/polls.ts` — no changes needed.
- **DEP-008**: Existing `SetExpirationRequest` type in `types/poll.ts` — already defined.

## 5. Files

- **FILE-001**: `frontend/src/types/poll.ts` — Modified. Add `SetExpirationResponse` interface.
- **FILE-002**: `frontend/src/api/polls.ts` — Modified. Add `setPollExpiration` function, import `SetExpirationRequest` and `SetExpirationResponse`.
- **FILE-003**: `frontend/src/pages/CreatePollPage.tsx` — Modified. Add `expiresAt` state, expiration validation, expiration in API payload, expiration date/time picker input, and 400 error mapping for `ExpiresAt` field.
- **FILE-004**: `frontend/src/pages/ManagePage.tsx` — Modified. Add expiration state variables, `handleSetExpiration` function, expiration form section with date/time picker and Save button, current expiration display, and import `setPollExpiration`. Possibly extract `ExpirationForm` sub-component if line count exceeds ~150.
- **FILE-005**: `frontend/tests/api/polls.test.ts` — Modified. Add `describe('setPollExpiration', ...)` block with 5 tests.
- **FILE-006**: `frontend/tests/pages/CreatePollPage.test.tsx` — Modified. Add 5 new tests for the expiration picker on the create page.
- **FILE-007**: `frontend/tests/pages/ManagePage.test.tsx` — Modified. Add `setPollExpiration` to mock, add 10 new tests for the expiration form on the management page.
- **FILE-008**: `frontend/e2e/create-poll.spec.ts` — Modified. Add 4 new E2E tests for the expiration picker on the create page.
- **FILE-009**: `frontend/e2e/manage.spec.ts` — Modified. Add `mockSetExpiration` helper and 4 new E2E tests for the expiration form on the management page.

## 6. Testing

### Unit / Component Tests (Vitest + RTL)

**API tests (`polls.test.ts`)**
- **TEST-001**: `setPollExpiration` — sends PUT to `/polls/{token}/expiration` with JSON body containing `expiresAt`.
- **TEST-002**: `setPollExpiration` — returns parsed `SetExpirationResponse` on 200.
- **TEST-003**: `setPollExpiration` — throws `ApiError` with status 404 on unknown token.
- **TEST-004**: `setPollExpiration` — throws `ApiError` with status 400 on validation error.
- **TEST-005**: `setPollExpiration` — throws `TypeError` on network failure.

**CreatePollPage tests (`CreatePollPage.test.tsx`)**
- **TEST-006**: Renders an expiration date input.
- **TEST-007**: Submits without expiration when picker is empty.
- **TEST-008**: Submits with expiration when picker is filled with a future date.
- **TEST-009**: Shows validation error when expiration is in the past.
- **TEST-010**: Maps server 400 error for `ExpiresAt` field to inline error.

**ManagePage tests (`ManagePage.test.tsx`)**
- **TEST-011**: Shows expiration form for active poll.
- **TEST-012**: Does not show expiration form for closed poll.
- **TEST-013**: Pre-fills expiration input when poll has existing `expiresAt`.
- **TEST-014**: Shows "No expiration set" when poll has no `expiresAt`.
- **TEST-015**: Shows current expiration date when poll has `expiresAt`.
- **TEST-016**: Clicking Save calls `setPollExpiration` and refreshes data.
- **TEST-017**: Shows validation error for empty expiration on Save click.
- **TEST-018**: Shows error message when `setPollExpiration` fails.
- **TEST-019**: Disables Save button while request is in progress.
- **TEST-020**: Shows success message after saving expiration.

### E2E Tests (Playwright)

**Create poll page (`create-poll.spec.ts`)**
- **TEST-021**: Renders an optional expiration date input.
- **TEST-022**: Submits poll without expiration when picker is empty.
- **TEST-023**: Submits poll with expiration when picker is filled.
- **TEST-024**: Shows validation error when expiration is in the past.

**Management page (`manage.spec.ts`)**
- **TEST-025**: Shows expiration form for active poll.
- **TEST-026**: Does not show expiration form for closed poll.
- **TEST-027**: Setting expiration updates the displayed data.
- **TEST-028**: Shows error when set-expiration fails.

## 7. Risks & Assumptions

- **RISK-001**: Native `<input type="datetime-local">` styling varies across browsers. The dark theme may not fully apply to the native date picker dropdown. Mitigated by setting `color-scheme: dark` on the input which most modern browsers respect.
- **RISK-002**: The `datetime-local` input value format (`YYYY-MM-DDTHH:mm`) does not include timezone info. The user's local time will be used. When converting to ISO via `new Date(value).toISOString()`, the browser applies the user's timezone offset. This is acceptable behaviour — the user enters a date/time in their local timezone and the backend receives UTC.
- **RISK-003**: `ManagePage` is currently ~135 lines. Adding the expiration form will push it over 150. The plan accounts for this by suggesting extraction of an `ExpirationForm` sub-component if needed.
- **ASSUMPTION-001**: The expiration picker on `CreatePollPage` is optional — the user can leave it empty and the poll will have no expiration. This matches the PRD: "Creators can optionally set an expiration date/time during creation."
- **ASSUMPTION-002**: No "clear expiration" feature. Once set, expiration can only be updated to a different future date, not removed. The PRD does not mention clearing.
- **ASSUMPTION-003**: The success message ("Expiration updated.") after saving on the management page auto-clears after 3 seconds. This provides user feedback without requiring a manual dismiss action.
- **ASSUMPTION-004**: The current expiration display (e.g., "Expires: Feb 28, 2026 6:00 PM") is shown to all users viewing the management page, including for closed/expired polls as informational text. The form (input + Save) is only shown for active polls.
- **ASSUMPTION-005**: On the management page, if the poll's `expiresAt` is in the past (poll has expired), the `derivePollStatus` function returns `'expired'` and the form is not shown (only the "Expired" badge and read-only info). The user cannot extend an already-expired poll because the backend rejects setting expiration on closed polls.

## 8. Related Specifications / Further Reading

- [PRD — MP-008 User Story](docs/PRD.md) — "Set poll expiration" acceptance criteria (§10.8).
- [Frontend Instructions §5.1](../.github/instructions/frontend.instructions.md) — CreatePollPage: "An optional expiration date/time picker."
- [Frontend Instructions §5.5](../.github/instructions/frontend.instructions.md) — ManagePage: "Set/update expiration: a date/time picker with a Save button."
- [Frontend Instructions §4.2](../.github/instructions/frontend.instructions.md) — Backend endpoint table: `PUT /api/polls/{token}/expiration`.
- [Frontend Instructions §4.3](../.github/instructions/frontend.instructions.md) — Error handling conventions (400, 404).
- [MP-008 Backend Plan](docs/tasks/MP-008-Backend.md) — Backend plan defining the `SetPollExpirationResult` response shape and `PUT /api/polls/{token}/expiration` endpoint.
- [MP-007 Frontend Plan](docs/tasks/MP-007-Frontend.md) — Prior plan that implemented the close-poll feature on ManagePage (sister feature, similar UI patterns).
- [MP-001 Frontend Plan](docs/tasks/MP-001-Frontend.md) — Prior plan that implemented the CreatePollPage.

## Verification

- `npm test` from `frontend/` — all existing tests still pass, plus the 20 new Vitest tests (5 API + 5 create page + 10 manage page) pass.
- `npm run test:e2e` from `frontend/` — all existing E2E tests pass, plus the 8 new Playwright specs (4 create page + 4 manage page) pass.
- `npx tsc --noEmit` from `frontend/` — zero type errors.
- Manual (CreatePollPage): start the backend and frontend dev servers. Navigate to `/`. Verify the expiration picker is visible and optional. Create a poll without expiration — verify it succeeds and navigates to `/poll-created`. Create another poll with a future expiration date — verify it succeeds. Try creating with a past expiration date — verify the inline validation error appears.
- Manual (ManagePage): create a poll without expiration. Navigate to `/manage/{token}`. Verify "No expiration set" is shown. Fill in a future date, click "Save" — verify the page updates to show the expiration date. Change the date to a different future date, click "Save" — verify it updates. Try saving a past date — verify the inline error. Close the poll via "Close Poll" — verify the expiration form disappears.
