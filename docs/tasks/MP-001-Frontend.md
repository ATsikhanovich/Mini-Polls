# MP-001 Frontend — Create a Poll

## TL;DR

Implement the poll creation form on the home page (`/`). The entire frontend is currently scaffolded but empty — all components return `<div />`, routing is not wired, and the API client has no endpoint functions. This plan covers: (1) setting up React Router in `App.tsx` with the `Layout` shell; (2) implementing the `ErrorMessage` component for inline validation; (3) adding the `createPoll` API function; (4) building the full `CreatePollPage` with dynamic options, client-side validation, and API submission; (5) tests for the page, component, and API layer. The `PollCreatedPage` content is MP-002's scope — this plan only ensures the route exists so navigation works.

## Steps

1. **Wire up React Router in `src/App.tsx`** — Import `Routes`, `Route`, and `Outlet` from `react-router-dom`. Use `Layout` as a layout route element wrapping all child routes. Define routes: `/` → `CreatePollPage`, `/poll-created` → `PollCreatedPage`, `/p/:slug` → `VotePage`, `/p/:slug/results` → `ResultsPage`, `/manage/:token` → `ManagePage`, `*` → `NotFoundPage`. The non-MP-001 pages remain as empty stubs; they simply need routes so the router is complete.

2. **Update `src/main.tsx`** — Wrap `<App />` in `<BrowserRouter>` from `react-router-dom`. Keep `StrictMode` as the outermost wrapper. This enables route hooks throughout the app.

3. **Implement `src/components/Layout.tsx`** — Render a page shell using React Router's `Outlet` for nested route content. Structure: a `<header>` containing an app title "Mini-Polls" that links to `/` (use `Link` from `react-router-dom`), styled with the primary colour palette. A `<main>` container with `max-w-2xl mx-auto px-4 py-8` for centered, constrained content. Named export `Layout`.

4. **Implement `src/components/ErrorMessage.tsx`** — Props: `{ message: string | null | undefined }`. If `message` is falsy, render nothing (`null`). Otherwise render a `<p>` with `text-red-600 text-sm mt-1` displaying the message. Named export `ErrorMessage`.

5. **Add `createPoll` function to `src/api/polls.ts`** — Signature: `createPoll(data: CreatePollRequest): Promise<CreatePollResponse>`. Implementation: call `request<CreatePollResponse>('/polls', { method: 'POST', body: JSON.stringify(data) })`. Import `CreatePollRequest` and `CreatePollResponse` from `../types/poll`. Export as a named export alongside the existing `request` and `ApiError` exports.

6. **Implement `src/pages/CreatePollPage.tsx`** — This is the core of MP-001. Use local `useState` for all form state:
   - `question: string` — initially empty.
   - `options: string[]` — initially `['', '']` (two empty inputs).
   - `errors: { question?: string; options?: string; optionItems?: Record<number, string> }` — validation error map.
   - `submitting: boolean` — disables the submit button during API call.
   - `submitError: string | null` — generic API/network error message.

   **Form layout:**
   - A heading "Create a Poll".
   - A `<label>` + `<input type="text">` for the question. Below it, `<ErrorMessage message={errors.question} />`.
   - A labeled section "Options" with an indexed list of text inputs. Each input has a remove button (× or similar) that is `disabled` when `options.length <= 2`. Below each input, `<ErrorMessage>` for per-option validation if that option is empty on submit. Below the list, an "Add option" button that appends an empty string to the `options` array.
   - `<ErrorMessage message={errors.options} />` for the aggregate "at least 2 non-empty options" error.
   - A `<button type="submit">` labeled "Create Poll", `disabled` while `submitting` is true.
   - `<ErrorMessage message={submitError} />` below the button for API/network errors.

   **Validation (on submit, before API call):**
   - `question.trim()` must be non-empty → error "Question is required".
   - At least 2 options must have non-empty trimmed text → error "At least 2 options are required".
   - Each individual option that is empty gets a per-item error "Option cannot be empty".
   - If any validation fails, set `errors` state and return early (do not call API).
   - Clear all errors at the start of each submit attempt.

   **Submission:**
   - Set `submitting = true`.
   - Call `createPoll({ question: question.trim(), options: options.map(o => o.trim()).filter(o => o.length > 0) })`.
   - On success: call `navigate('/poll-created', { state: { votingUrl: response.votingUrl, managementUrl: response.managementUrl, slug: response.slug, managementToken: response.managementToken } })`.
   - On `ApiError` with status 400: parse `body` as `ProblemDetails`, extract validation messages, and map to `errors` state.
   - On network or unexpected errors: set `submitError` to "Something went wrong. Please try again.".
   - Set `submitting = false` in a `finally` block.

   **Styling:** Input fields: `border rounded-(--radius-input) px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary-500`. Primary button: `bg-primary-600 text-white rounded-(--radius-btn) px-4 py-2 hover:bg-primary-700 disabled:opacity-50`. "Add option" button: secondary/outline style. Remove button: small, muted, inline with the option input.

7. **Tests — `tests/pages/CreatePollPage.test.tsx`** — New file. Import `render`, `screen` from RTL, `userEvent` from `@testing-library/user-event`, `vi` from Vitest. Wrap renders in `MemoryRouter`. Mock `../../src/api/polls` module via `vi.mock`. Test cases:
   - Renders the question input and at least 2 option inputs.
   - "Add option" button appends a new input field.
   - Remove button removes an option; remove buttons are disabled when only 2 options remain.
   - Submit with empty question shows "Question is required" error.
   - Submit with fewer than 2 non-empty options shows the options error.
   - Successful submit calls `createPoll` with trimmed data and navigates to `/poll-created`.
   - API 400 error displays validation messages inline.
   - Network error displays generic error message.

8. **Tests — `tests/components/ErrorMessage.test.tsx`** — New file. Test cases:
   - Renders nothing when `message` is `null`, `undefined`, or empty string.
   - Renders the error text when `message` is provided.

9. **Tests — `tests/api/polls.test.ts`** — New file. Mock `globalThis.fetch` via `vi.spyOn`. Test cases:
   - `createPoll` sends POST to correct URL with JSON body and `Content-Type` header.
   - `createPoll` returns parsed response on success (201).
   - `createPoll` throws `ApiError` with status and body on 400.
   - `createPoll` throws `ApiError` on network failure.

## Verification

- `npm run typecheck` from `frontend/` — zero errors.
- `npm run build` from `frontend/` — successful build.
- `npm test` from `frontend/` — all existing tests pass plus all new tests pass.
- Manual: start frontend dev server (`npm run dev`), open `http://localhost:3000`, verify the form renders with question input, 2 option inputs, add/remove buttons, and validation errors appear on empty submit. With the backend running, verify successful poll creation navigates to `/poll-created`.

## Decisions

- **Router in main.tsx vs App.tsx**: `BrowserRouter` wraps `App` in `main.tsx` (React Router v7 convention), while `App.tsx` defines `Routes`/`Route` elements — keeps route definitions co-located and `main.tsx` as a thin entry point.
- **Layout via Outlet**: `Layout` is used as a React Router layout route so all child routes inherit the header/container automatically via `Outlet`.
- **No expiration picker in MP-001**: The MP-001 acceptance criteria do not mention expiration. The optional expiration picker belongs to MP-008's scope. The `CreatePollRequest` type already has `expiresAt` as optional, so the field can be added later without breaking changes.
- **No Zustand store changes**: The form uses local `useState` per the frontend instructions ("Local component state is preferred for form inputs and page-level data fetching results"). The poll store remains a placeholder.
- **PollCreatedPage stays a stub**: Its implementation belongs to MP-002. This plan only ensures the route exists for navigation after successful creation.
- **Validation on submit, not on blur**: Keeps it simple and consistent with the PRD's "inline, on submit" specification. Errors clear at the start of the next submit attempt.
