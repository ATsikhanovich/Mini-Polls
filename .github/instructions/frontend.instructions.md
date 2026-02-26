---
applyTo: 'frontend/**'
---

# Frontend Instructions — Mini-Polls

These instructions apply to the `frontend/` folder and govern all frontend code for the Mini-Polls application.

---

## 1. Tech Stack

| Concern            | Technology                                |
| ------------------ | ----------------------------------------- |
| Framework          | React 19                                  |
| Language           | TypeScript (strict mode)                  |
| Build Tool         | Vite                                      |
| Routing            | React Router v7                           |
| State Management   | Zustand                                   |
| Styling            | Tailwind CSS (utility-first, no component library) |
| HTTP Client        | Native `fetch` API                        |
| Form Handling      | Manual state handling (no form library)   |
| Testing            | Vitest + React Testing Library            |
| Package Manager    | npm                                       |

Do **not** add libraries beyond the above unless explicitly approved. Keep dependencies minimal.

---

## 2. Project Structure

The `frontend/` folder is a standalone Vite + React project.

```
frontend/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── public/
│   └── favicon.ico
├── src/
│   ├── main.tsx                    # App entry point, router setup
│   ├── App.tsx                     # Root component with route definitions
│   ├── api/                        # API client functions
│   │   └── polls.ts                # All poll/vote-related API calls
│   ├── components/                 # Shared/reusable UI components
│   │   ├── Layout.tsx              # Page layout shell (header, container)
│   │   ├── CopyButton.tsx          # Copy-to-clipboard button
│   │   ├── ProgressBar.tsx         # Vote result progress bar
│   │   ├── StatusBadge.tsx         # Poll status indicator (active/closed/expired)
│   │   └── ErrorMessage.tsx        # Inline validation/error display
│   ├── pages/                      # Route-level page components
│   │   ├── CreatePollPage.tsx      # Home page — poll creation form
│   │   ├── PollCreatedPage.tsx     # Confirmation page with voting & management links
│   │   ├── VotePage.tsx            # Vote on a poll (or redirect to results if already voted)
│   │   ├── ResultsPage.tsx         # Poll results view (after voting)
│   │   ├── ManagePage.tsx          # Poll management (results, close, set expiration)
│   │   └── NotFoundPage.tsx        # 404 — poll not found or invalid link
│   ├── stores/                     # Zustand stores
│   │   └── pollStore.ts            # Poll creation form state, if needed
│   ├── types/                      # Shared TypeScript types/interfaces
│   │   └── poll.ts                 # Poll, PollOption, VoteResult, etc.
│   ├── utils/                      # Utility/helper functions
│   │   └── formatPercent.ts        # Example: percentage formatting
│   └── styles/
│       └── index.css               # Tailwind directives (@tailwind base, etc.)
└── tests/
    ├── setup.ts                    # Vitest + RTL global setup
    ├── components/                 # Component-level tests
    └── pages/                      # Page-level tests
```

### Conventions

- **One component per file.** The filename must match the default export name (PascalCase).
- Group code by **feature area** (`pages/`, `components/`, `api/`, `stores/`, `types/`).
- Shared/reusable components go in `components/`; page-specific sub-components live next to their page file (e.g., `pages/CreatePollPage/OptionInput.tsx` when extracted).
- Keep `api/` functions purely responsible for HTTP calls — no UI logic or state management.

---

## 3. Routing

Use **React Router v7** with the following route structure:

| Path                   | Page Component      | Purpose                                    |
| ---------------------- | ------------------- | ------------------------------------------ |
| `/`                    | `CreatePollPage`    | Home page — poll creation form             |
| `/p/:slug`             | `VotePage`          | Vote on a poll (public short link)         |
| `/p/:slug/results`     | `ResultsPage`       | Poll results (shown after voting)          |
| `/poll-created`        | `PollCreatedPage`   | Confirmation with voting & management links|
| `/manage/:token`       | `ManagePage`        | Poll management via secret token           |
| `*`                    | `NotFoundPage`      | 404 catch-all                              |

### Route rules

- The voting link pattern `/p/:slug` mirrors the backend short link convention.
- The management route `/manage/:token` uses the secret management token as the URL parameter.
- After creating a poll, navigate to `/poll-created` passing the generated links via route state (React Router `state`). If the user refreshes and state is lost, redirect to `/`.
- If the backend returns 404 for a slug or token, render the `NotFoundPage` inline (do not navigate away).

---

## 4. API Integration

### 4.1 API Client

Create typed `async` functions in `src/api/polls.ts` that wrap native `fetch` calls to the backend REST API.

```
Base URL: configurable via environment variable VITE_API_BASE_URL (default: http://localhost:8080/api)
```

All API functions must:
- Accept typed parameters and return typed responses.
- Throw or return structured error information on non-2xx responses.
- Include `Content-Type: application/json` for request bodies.
- **Never** access React state, hooks, or components.

### 4.2 Backend API Endpoints (reference)

| Method | Endpoint                           | Frontend usage                      |
| ------ | ---------------------------------- | ----------------------------------- |
| POST   | `/api/polls`                       | Create a poll                       |
| GET    | `/api/polls/by-slug/{slug}`        | Load poll for voting page           |
| GET    | `/api/polls/by-token/{token}`      | Load poll for management page       |
| PUT    | `/api/polls/{token}/expiration`    | Set/update expiration               |
| POST   | `/api/polls/{token}/close`         | Close a poll                        |
| POST   | `/api/polls/{slug}/votes`          | Cast a vote                         |
| GET    | `/api/polls/{slug}/results`        | Get aggregated results              |
| GET    | `/api/polls/{slug}/vote-check`     | Check if current IP already voted   |

### 4.3 Error Handling

- On `400` responses, parse the `ProblemDetails` body and display inline validation errors.
- On `404`, show the `NotFoundPage`.
- On `409` (duplicate vote), display the current results with an "already voted" message.
- On `410` or closed-poll responses, display the final results with a "Poll closed" notice.
- On network errors or unexpected failures, show a generic error message with a retry option.

---

## 5. Pages — Behaviour Specifications

### 5.1 CreatePollPage (`/`)

- Displays a form with:
  - A **question** text input (required, non-empty).
  - A dynamic list of **option** text inputs (minimum 2, no upper limit).
  - An "**Add option**" button that appends a new empty input.
  - A remove button on each option (disabled when only 2 options remain).
  - An optional **expiration date/time** picker.
  - A "**Create Poll**" submit button.
- **Validation** (inline, on submit):
  - Question must be non-empty.
  - At least 2 options must have non-empty text.
  - Expiration date, if set, must be in the future.
- On successful creation, navigate to `/poll-created` with the returned voting link and management link in route state.

### 5.2 PollCreatedPage (`/poll-created`)

- Displays the **voting link** and **management link** received from the creation response.
- Each link has a **Copy to clipboard** button.
- Includes a direct link/button to go to the management page.
- If accessed without route state (e.g., page refresh), redirect to `/`.

### 5.3 VotePage (`/p/:slug`)

- On load:
  1. Fetch the poll by slug.
  2. Check if the current IP has already voted (`vote-check` endpoint).
  3. If already voted or poll is closed/expired → redirect to `/p/:slug/results`.
- Display the poll **question** and all **options** as selectable radio buttons.
- A "**Vote**" button submits the selected option.
- After voting, navigate to `/p/:slug/results`.

### 5.4 ResultsPage (`/p/:slug/results`)

- Fetch aggregated results for the poll.
- Display each option with:
  - Option text.
  - Vote count.
  - Percentage of total votes.
  - A visual **progress bar**.
- Display the **total number of votes**.
- If the poll is closed/expired, show a status notice ("Poll closed" / "Poll expired").

### 5.5 ManagePage (`/manage/:token`)

- Fetch poll details via the management token.
- Display:
  - Poll question.
  - Full results (same format as ResultsPage).
  - Poll status (active, closed, expired).
  - The public voting link with a Copy button.
- **Actions** (for active polls):
  - **Set/update expiration**: a date/time picker with a "Save" button. Expiration must be in the future.
  - **Close poll**: a "Close Poll" button with a confirmation prompt.
- After closing or updating expiration, refresh the displayed data.

### 5.6 NotFoundPage

- Friendly message: "Poll not found."
- Link back to the home page (`/`) to create a new poll.

---

## 6. State Management (Zustand)

- Use Zustand **only** when state needs to be shared across components that are not in a direct parent-child relationship.
- Local component state (`useState`) is preferred for form inputs and page-level data fetching results.
- Do **not** create a global "loading" or "error" store — handle loading/error states locally in each page component.
- Keep stores small and focused. One store per concern if needed (e.g., `pollStore` for cross-page poll data).

---

## 7. Styling (Tailwind CSS)

### 7.1 General

- Use **Tailwind utility classes** directly in JSX. Do not write custom CSS unless absolutely necessary.
- Design must be **responsive** — mobile-first approach. Target comfortable usage on both desktop and mobile browsers.
- Maintain a **clean, minimal** visual style with ample whitespace.

### 7.2 Design Tokens

Define custom Tailwind theme extensions in `tailwind.config.ts` for:
- Primary colour palette (used for buttons, links, active states).
- Progress bar colours (voted option highlight, default fill).
- Consistent spacing and border-radius values.

### 7.3 Component Styling Rules

- Buttons: clearly styled with hover/focus/disabled states.
- Form inputs: consistent border, focus ring, and error state styling.
- Progress bars: horizontal bars with percentage fill and label.
- Status badges: colour-coded for active (green), closed (red), expired (grey).

---

## 8. TypeScript Types

Define all shared types/interfaces in `src/types/`.

### 8.1 Core Types (in `src/types/poll.ts`)

```ts
interface Poll {
  id: string;
  question: string;
  slug: string;
  expiresAt: string | null;    // ISO 8601
  closedAt: string | null;     // ISO 8601
  createdAt: string;           // ISO 8601
  status: 'active' | 'closed' | 'expired';
  options: PollOption[];
}

interface PollOption {
  id: string;
  text: string;
  sortOrder: number;
}

interface PollResults {
  pollId: string;
  question: string;
  status: 'active' | 'closed' | 'expired';
  totalVotes: number;
  options: OptionResult[];
}

interface OptionResult {
  optionId: string;
  text: string;
  voteCount: number;
  percentage: number;
}

interface CreatePollRequest {
  question: string;
  options: string[];
  expiresAt?: string | null;
}

interface CreatePollResponse {
  slug: string;
  managementToken: string;
  votingUrl: string;
  managementUrl: string;
}

interface CastVoteRequest {
  optionId: string;
}
```

Adjust field names to match the actual backend API response DTOs. These types serve as the starting reference.

---

## 9. Testing

### 9.1 General Rules

- Use **Vitest** as the test runner and **React Testing Library** for component rendering.
- Configure in `vite.config.ts` (`test` block) and a `tests/setup.ts` file for global RTL setup (`@testing-library/jest-dom` matchers).
- Follow the **Arrange / Act / Assert** pattern.
- Name test files: `ComponentName.test.tsx` or `utilName.test.ts`, co-located in the `tests/` directory mirroring the source structure.

### 9.2 What to Test

- **Pages**: render correctly for key states (loading, data loaded, error, empty), user interactions (filling form, clicking buttons), and navigation.
- **Components**: render with various props, handle callbacks.
- **API functions**: mock `fetch` and verify correct URLs, methods, headers, and body serialisation.
- **Utility functions**: pure unit tests.

### 9.3 Mocking

- Mock `fetch` globally or per-test using `vi.fn()` / `vi.spyOn(globalThis, 'fetch')`.
- Mock React Router navigation (`useNavigate`) when testing navigation side effects.
- Do **not** mock Zustand stores in component tests — test with real stores and initial state.

---

## 10. Environment & Configuration

### 10.1 Environment Variables

Use Vite's `import.meta.env` for configuration. Prefix all custom variables with `VITE_`.

| Variable              | Description                     | Default                          |
| --------------------- | ------------------------------- | -------------------------------- |
| `VITE_API_BASE_URL`   | Backend API base URL            | `http://localhost:8080/api`      |

### 10.2 Vite Config

- Configure the dev server proxy to forward `/api` requests to the backend during development, avoiding CORS issues.
- Enable source maps in development.
- Output build artifacts to `dist/`.

---

## 11. Code Style

- Use **named exports** for components. Use **default export** only in page components if required by the router.
- Use `function` declarations for React components (not arrow function assignments).
- Prefer **`const` + arrow functions** for non-component helpers and callbacks.
- Use **explicit return types** on API functions. Component return types can be inferred.
- Destructure props in function parameters.
- No `any` types — use `unknown` and narrow with type guards if the type is truly uncertain.
- Use **template literals** for string interpolation, not concatenation.
- Keep components under ~150 lines. Extract sub-components or custom hooks when a component grows beyond that.
- File names: PascalCase for components/pages (e.g., `CreatePollPage.tsx`), camelCase for non-component files (e.g., `polls.ts`, `formatPercent.ts`).
- No `console.log` in committed code — use it only during debugging.

---

## 12. Docker & Build

- The frontend Dockerfile (at `frontend/Dockerfile`) should use a **multi-stage build**:
  1. **Stage 1 (build)**: Node.js image → `npm ci` → `npm run build`.
  2. **Stage 2 (serve)**: Nginx (or similar lightweight static server) → copy `dist/` and serve.
- The Nginx config must handle SPA client-side routing by falling back all non-file requests to `index.html`.
- Expose port **3000** by default.
- The `VITE_API_BASE_URL` must be configurable at build time via a Docker build arg.

---

## 13. Key Reminders

- **No authentication** — the app is anonymous by design. The management token in the URL is the only access control.
- **All validation must also exist on the backend.** Frontend validation is for UX only.
- **IP-based duplicate vote prevention** is enforced by the backend. The frontend's role is to check via `vote-check` and display the appropriate UI.
- Short links follow the pattern `/p/{slug}` on the frontend, mapping to `/api/polls/by-slug/{slug}` on the backend.
- The management link follows the pattern `/manage/{token}` on the frontend, mapping to `/api/polls/by-token/{token}` on the backend.
- Keep the UI **fast and minimal** — avoid unnecessary loading spinners, animations, or heavy assets.
