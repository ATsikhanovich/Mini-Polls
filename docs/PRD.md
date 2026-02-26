# PRD: Mini-Polls

## 1. Product overview

### 1.1 Document title and version

- PRD: Mini-Polls
- Version: 1.0

### 1.2 Product summary

Mini-Polls is a lightweight web application that allows anyone to quickly create single-choice polls, share them via self-hosted short links, and collect votes from friends or colleagues — all without requiring sign-up or authentication.

Poll creators receive a special management link upon poll creation that lets them view real-time results, set an expiration date, or manually close the poll. Voters see the aggregated results immediately after casting their vote.

The project is a personal/hobby application designed for simplicity and ease of deployment via Docker, with a React frontend and a .NET backend following clean architecture principles.

## 2. Goals

### 2.1 Business goals

- Provide a zero-friction poll creation experience with no sign-up required.
- Deliver a self-contained, easily deployable application via Docker.
- Offer a minimal yet complete polling feature set suitable for casual use among friends.

### 2.2 User goals

- Create a poll with custom answer options in seconds.
- Share a short, memorable link with friends to collect votes.
- View real-time poll results via a private management link.
- Control poll lifecycle (set expiration, close manually) without needing an account.

### 2.3 Non-goals

- Multi-question surveys or complex form builders.
- User accounts, profiles, or social features.
- Advanced analytics, dashboards, or export capabilities.
- Public poll discovery or browsing.
- Mobile native applications (web-only).
- Horizontal scaling or high-availability architecture.

## 3. User personas

### 3.1 Key user types

- Poll creator — a person who wants to ask a question and gather opinions.
- Voter — a person who receives a poll link and casts a vote.

### 3.2 Basic persona details

- **Alex (poll creator)**: A casual user who wants to quickly settle a group decision (e.g., "Where should we eat tonight?") by creating a poll and sharing it in a group chat.
- **Sam (voter)**: A friend of Alex who clicks the shared link, reads the question, picks an option, and sees the results — all in under 10 seconds.

### 3.3 Role-based access

- **Poll creator**: Can create polls, receive a management link, view results, set expiration, and manually close a poll.
- **Voter**: Can view an active poll, cast a single vote, and see results after voting. Cannot create or manage polls through the voting link.

## 4. Functional requirements

- **Poll creation** (Priority: High)
  - Users can create a poll by entering a question and two or more answer options.
  - There is no limit on the number of answer options.
  - No authentication or sign-up is required.
  - Upon creation, the system generates two links: a public voting short link and a private management link.
  - Both links are displayed to the creator on a confirmation page.

- **Self-hosted short links** (Priority: High)
  - Each poll gets a unique, short, URL-friendly slug (e.g., `/p/Ab3xZ`).
  - Short links are generated and resolved entirely within the application (no external services).
  - The voting link uses the short slug; the management link uses a separate secret token.

- **Voting** (Priority: High)
  - Voters access the poll via the short link and see the question and all answer options.
  - Voters select exactly one option and submit their vote.
  - After voting, the voter is shown the current poll results (vote counts and percentages).
  - Duplicate votes from the same IP address are prevented. If a repeat vote is detected, the voter sees the current results instead of the voting form.

- **Results viewing** (Priority: High)
  - After voting, voters see aggregated results (option name, vote count, percentage).
  - Poll creators can view results at any time via the management link, including before any votes are cast.

- **Poll management** (Priority: High)
  - The management link allows the creator to view real-time results.
  - The creator can set or update an expiration date/time for the poll.
  - The creator can manually close the poll at any time.
  - Once a poll is closed (manually or by expiration), no further votes are accepted.
  - Voters who visit a closed poll see the final results and a notice that the poll is closed.

- **Poll expiration** (Priority: Medium)
  - Creators can optionally set an expiration date/time during creation or later via the management link.
  - The system automatically marks the poll as closed when the expiration time is reached.
  - Expired polls display final results and a closed notice to voters.

- **IP-based duplicate prevention** (Priority: Medium)
  - The server records the voter's IP address with each vote.
  - If a vote from the same IP already exists for a given poll, the vote is rejected and results are shown instead.

## 5. User experience

### 5.1 Entry points & first-time user flow

- The user lands on the home page and immediately sees a poll creation form — no onboarding, no sign-up.
- The form contains a question field and a dynamic list of answer option inputs (starting with two, with an "Add option" button).
- An optional expiration date/time picker is available.
- A "Create Poll" button submits the form.

### 5.2 Core experience

- **Create**: The creator fills in the question and options, optionally sets an expiration, and clicks "Create Poll."
  - The experience is fast and distraction-free, completing in under 30 seconds.

- **Share**: A confirmation page shows the short voting link and the management link with copy-to-clipboard buttons.
  - The creator can immediately share the voting link in a chat or message.

- **Vote**: A voter opens the short link, sees the question and options, selects one, and clicks "Vote."
  - The entire voting flow takes under 10 seconds.

- **Results**: After voting, the voter sees a results view with vote counts and percentage bars.
  - Provides instant gratification and transparency.

- **Manage**: The creator opens the management link to see live results, change expiration, or close the poll.
  - Gives the creator full control without needing an account.

### 5.3 Advanced features & edge cases

- If a voter visits a poll they have already voted on (same IP), they see results directly instead of the voting form.
- If a voter visits a closed or expired poll, they see the final results with a "Poll closed" notice.
- If a voter visits an invalid or non-existent short link, they see a friendly 404 page.
- The management link should be treated as a secret; if lost, the creator cannot recover it.

### 5.4 UI/UX highlights

- Clean, minimal interface using Tailwind CSS utility classes.
- Responsive design that works well on both desktop and mobile browsers.
- Copy-to-clipboard buttons for the voting and management links.
- Visual progress bars or percentage indicators on the results page.
- Clear status indicators for poll state (active, closed, expired).
- Immediate form validation (e.g., minimum two options, non-empty question).

## 6. Narrative

Alex wants to decide where to have dinner with friends tonight. He opens Mini-Polls in his browser, types "Where should we eat tonight?", adds three restaurant options, and clicks "Create Poll." In seconds he has a short link that he drops into the group chat. His friends tap the link, pick their favorite, and instantly see which restaurant is winning. A few minutes later, Alex checks the management link, sees the results are clear, closes the poll, and announces the winner. No sign-ups, no apps to install, no friction — just a quick, fun decision made together.

## 7. Success metrics

### 7.1 User-centric metrics

- Time to create a poll: under 30 seconds.
- Time to vote: under 10 seconds.
- Poll completion rate (votes cast / link opens): target > 60%.

### 7.2 Business metrics

- Number of polls created per week (growth indicator).
- Average number of votes per poll (engagement indicator).

### 7.3 Technical metrics

- API response time for poll creation and voting: < 200ms (p95).
- Application uptime: > 99% (within the context of a hobby deployment).
- Docker image size: reasonable for a single-container or two-container deployment.

## 8. Technical considerations

### 8.1 Integration points

- **Frontend to backend**: REST API communication between React SPA and .NET backend.
- **Short link resolution**: The backend resolves short slugs to poll IDs internally.
- **IP detection**: The backend reads the voter's IP from the HTTP request (with support for `X-Forwarded-For` behind a reverse proxy).

### 8.2 Data storage & privacy

- SQLite database via EF Core for all persistent data (polls, options, votes, IP records).
- Voter IP addresses are stored for duplicate prevention; no other personal data is collected.
- No cookies or tracking beyond IP-based vote deduplication.
- The SQLite database file is stored on a Docker volume for persistence.

### 8.3 Scalability & performance

- SQLite is sufficient for the expected hobby-level traffic.
- Single-instance deployment; no horizontal scaling planned.
- Frontend is a static SPA served alongside or separately from the API.

### 8.4 Potential challenges

- IP-based duplicate prevention may be inaccurate for users behind shared NAT or VPNs (accepted trade-off for a hobby project).
- Management link security relies on the secrecy of the URL token; there is no authentication fallback.
- SQLite write concurrency is limited; acceptable for low-traffic usage.

## 9. Milestones & sequencing

### 9.1 Project estimate

- Small project: approximately 3–4 weeks for a solo developer.

### 9.2 Team size & composition

- 1 developer (full-stack): responsible for frontend, backend, database, and Docker setup.

### 9.3 Suggested phases

- **Phase 1**: Project scaffolding (0.5 weeks)
  - Set up .NET 10 solution with clean architecture, MediatR, EF Core + SQLite.
  - Set up React 18 + TypeScript + Zustand + Tailwind project.
  - Configure project structure, dependencies, and dev tooling.

- **Phase 2**: Poll creation and short link generation (0.5 weeks)
  - Design and implement the database schema for polls and options.
  - Implement poll creation API endpoint.
  - Implement self-hosted short link generation and resolution logic.
  - Build the poll creation form in the frontend and the confirmation page with generated links.

- **Phase 3**: Voting and results (1 week)
  - Implement voting API endpoint with IP-based duplicate prevention.
  - Implement results API endpoint.
  - Build frontend pages: vote and results views.

- **Phase 4**: Poll management and expiration (0.5 weeks)
  - Implement management link API (view results, set expiration, close poll).
  - Build management page in the frontend.
  - Implement automatic expiration check logic.

- **Phase 5**: Polish and deployment (0.5–1 week)
  - Add form validation, error handling, and edge case UX.
  - Create Dockerfile and docker-compose configuration.
  - Write a README with setup and deployment instructions.
  - End-to-end manual testing.

## 10. User stories

### 10.1 Create a poll

- **ID**: MP-001
- **Description**: As a poll creator, I want to enter a question and multiple answer options so that I can create a new poll.
- **Acceptance criteria**:
  - The home page displays a form with a question text field and at least two answer option inputs.
  - The creator can add additional answer option fields by clicking an "Add option" button.
  - The creator can remove an answer option (as long as at least two remain).
  - Submitting the form with a non-empty question and at least two non-empty options creates a poll and navigates to the confirmation page.
  - Validation errors are shown inline if the question is empty or fewer than two options are provided.

### 10.2 Receive voting and management links

- **ID**: MP-002
- **Description**: As a poll creator, I want to receive a short voting link and a secret management link after creating a poll so that I can share the poll and manage it later.
- **Acceptance criteria**:
  - After successful poll creation, a confirmation page displays the short voting link and the management link.
  - Each link has a "Copy to clipboard" button that copies the URL.
  - The voting link uses a short, URL-friendly slug (e.g., `/p/Ab3xZ`).
  - The management link contains a separate secret token (e.g., `/manage/secretToken123`).

### 10.3 Vote on a poll

- **ID**: MP-003
- **Description**: As a voter, I want to open a poll link, see the question and options, and cast my vote so that my opinion is counted.
- **Acceptance criteria**:
  - Opening the voting short link displays the poll question and all answer options as selectable choices.
  - The voter can select exactly one option.
  - Clicking "Vote" submits the vote and displays the results page.
  - If the vote is successfully recorded, the voter's selection is included in the displayed results.

### 10.4 View results after voting

- **ID**: MP-004
- **Description**: As a voter, I want to see the poll results immediately after voting so that I know how others have voted.
- **Acceptance criteria**:
  - After submitting a vote, the results page shows each option with its vote count and percentage.
  - Results include a visual indicator (e.g., progress bar) for each option.
  - The total number of votes is displayed.

### 10.5 Prevent duplicate votes

- **ID**: MP-005
- **Description**: As the system, I want to prevent the same person from voting twice on the same poll so that results are fair.
- **Acceptance criteria**:
  - If a voter's IP address has already been recorded for the poll, the voting form is not shown.
  - Instead, the voter sees the current results with a message indicating they have already voted.
  - The duplicate vote is not recorded in the database.

### 10.6 View results via management link

- **ID**: MP-006
- **Description**: As a poll creator, I want to view real-time results via my management link so that I can monitor the poll without voting.
- **Acceptance criteria**:
  - Opening the management link displays the poll question, all options with vote counts and percentages, and the total number of votes.
  - The results update when the page is refreshed.
  - The management page is accessible regardless of whether the creator has voted.

### 10.7 Close a poll manually

- **ID**: MP-007
- **Description**: As a poll creator, I want to manually close my poll via the management link so that no further votes are accepted.
- **Acceptance criteria**:
  - The management page shows a "Close poll" button for active polls.
  - Clicking "Close poll" marks the poll as closed and disables further voting.
  - After closing, the management page shows the poll status as "Closed."
  - Voters visiting the poll after closure see the final results and a "Poll closed" notice.

### 10.8 Set poll expiration

- **ID**: MP-008
- **Description**: As a poll creator, I want to set an expiration date and time for my poll so that it automatically closes at a specific time.
- **Acceptance criteria**:
  - During poll creation, the creator can optionally set an expiration date/time.
  - On the management page, the creator can set or update the expiration date/time for an active poll.
  - The expiration date/time must be in the future.
  - When the expiration time is reached, the poll is automatically marked as closed.
  - Voters visiting an expired poll see the final results and a "Poll expired" notice.

### 10.9 Handle invalid poll links

- **ID**: MP-009
- **Description**: As a user, I want to see a friendly error page when I visit an invalid or non-existent poll link so that I understand what happened.
- **Acceptance criteria**:
  - Visiting a non-existent short link slug displays a 404 page with a clear message (e.g., "Poll not found").
  - Visiting an invalid management token displays a 404 page.
  - The 404 page includes a link back to the home page to create a new poll.

### 10.10 Deploy with Docker

- **ID**: MP-010
- **Description**: As a developer, I want to deploy the entire application using Docker so that setup is simple and reproducible.
- **Acceptance criteria**:
  - A Dockerfile (or docker-compose file) is provided that builds and runs both the frontend and backend.
  - The SQLite database file is persisted via a Docker volume.
  - The application starts successfully with a single `docker compose up` command.
  - A README documents the Docker deployment steps.