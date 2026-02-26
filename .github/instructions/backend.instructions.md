applyTo: 'backend/**'

# Backend Instructions — Mini-Polls

These instructions apply to the `backend/` folder and govern all backend code for the Mini-Polls application.

---

## 1. Tech Stack

| Concern              | Technology                          |
| -------------------- | ----------------------------------- |
| Runtime              | .NET 10                             |
| Language             | C# (latest stable version)         |
| Architecture         | Clean Architecture                  |
| Database             | SQLite via EF Core                  |
| CQRS / Messaging     | MediatR                             |
| Validation           | FluentValidation                    |
| Testing              | xUnit + FluentAssertions            |
| Containerisation     | Docker (Dockerfile in repo root)    |

Do **not** add libraries beyond the above unless explicitly approved. Keep dependencies minimal.

---

## 2. Solution & Project Structure

The solution file (`MiniPolls.sln`) lives directly inside `backend/`.

```
backend/
├── MiniPolls.sln
├── src/
│   ├── MiniPolls.Domain/            # Entities, value objects, enums, domain exceptions
│   ├── MiniPolls.Application/       # Use cases (MediatR handlers), interfaces, DTOs, validators
│   ├── MiniPolls.Infrastructure/    # EF Core DbContext, migrations, repository implementations
│   └── MiniPolls.Api/               # ASP.NET host, controllers/endpoints, middleware, DI setup
└── tests/
    ├── MiniPolls.Domain.Tests/
    ├── MiniPolls.Application.Tests/
    ├── MiniPolls.Infrastructure.Tests/
    └── MiniPolls.Api.Tests/
```

### Dependency Rules (strict)

- **Domain** → references nothing (pure C#, no NuGet beyond base SDK).
- **Application** → references **Domain** only. Declares interfaces that Infrastructure implements.
- **Infrastructure** → references **Application** and **Domain**. Contains all EF Core and external I/O code.
- **Api** → references **Application** and **Infrastructure** (for DI wiring). Never references **Domain** directly for service logic.

---

## 3. Domain Layer (`MiniPolls.Domain`)

### 3.1 Core Entities

- **Poll** — represents a single poll.
  - `Id` (Guid, primary key)
  - `Question` (string, required, non-empty)
  - `Slug` (string, unique, URL-friendly short code, e.g. `Ab3xZ`)
  - `ManagementToken` (string, unique, secret token for the management link)
  - `ExpiresAt` (DateTimeOffset?, optional expiration timestamp)
  - `ClosedAt` (DateTimeOffset?, set when the poll is manually closed or expires)
  - `CreatedAt` (DateTimeOffset)
  - Navigation: `Options` (collection of **PollOption**)

- **PollOption** — one answer option within a poll.
  - `Id` (Guid, primary key)
  - `PollId` (Guid, FK → Poll)
  - `Text` (string, required, non-empty)
  - `SortOrder` (int)
  - Navigation: `Votes` (collection of **Vote**)

- **Vote** — a single recorded vote.
  - `Id` (Guid, primary key)
  - `PollOptionId` (Guid, FK → PollOption)
  - `IpAddress` (string, voter's IP)
  - `CastAt` (DateTimeOffset)

### 3.2 Domain Rules

- A poll must have at least **two** options.
- A poll is considered **closed** when `ClosedAt` is not null **or** `ExpiresAt` is in the past.
- No vote may be cast on a closed poll.
- One IP address may cast at most **one** vote per poll (duplicate prevention).
- The `Slug` must be a short, URL-friendly, unique string (alphanumeric, 5–8 characters).
- The `ManagementToken` must be a cryptographically random, URL-safe string (≥ 32 characters).

Enforce invariants inside the entity or via domain methods — do not rely on validation at the API layer alone.

---

## 4. Application Layer (`MiniPolls.Application`)

### 4.1 Use Cases (MediatR Requests & Handlers)

Organize by feature folder:

```
Application/
├── Polls/
│   ├── CreatePoll/
│   │   ├── CreatePollCommand.cs        (IRequest<CreatePollResult>)
│   │   ├── CreatePollCommandHandler.cs
│   │   ├── CreatePollCommandValidator.cs (FluentValidation)
│   │   └── CreatePollResult.cs          (DTO)
│   ├── GetPollBySlug/
│   │   ├── GetPollBySlugQuery.cs
│   │   ├── GetPollBySlugQueryHandler.cs
│   │   └── PollDto.cs
│   ├── GetPollByManagementToken/
│   │   └── ...
│   ├── ClosePoll/
│   │   └── ...
│   └── SetPollExpiration/
│       └── ...
├── Votes/
│   ├── CastVote/
│   │   ├── CastVoteCommand.cs
│   │   ├── CastVoteCommandHandler.cs
│   │   ├── CastVoteCommandValidator.cs
│   │   └── CastVoteResult.cs
│   └── GetResults/
│       └── ...
├── Interfaces/
│   ├── IPollRepository.cs
│   └── IVoteRepository.cs
└── Behaviours/
    └── ValidationBehaviour.cs           (MediatR pipeline for FluentValidation)
```

### 4.2 Conventions

- **Commands** mutate state; **Queries** are read-only. Name them accordingly (`…Command` / `…Query`).
- Each use case lives in its own folder with handler, request, validator, and result DTO.
- Validators use **FluentValidation** and are run via a MediatR `IPipelineBehavior<,>` (`ValidationBehaviour`).
- Return result DTOs from handlers — never return domain entities across the Application boundary.
- Interfaces for repositories are declared here; implementations live in Infrastructure.

---

## 5. Infrastructure Layer (`MiniPolls.Infrastructure`)

### 5.1 EF Core & SQLite

- `MiniPollsDbContext` inherits `DbContext`.
- Use **code-first migrations**. Migrations are stored under `Infrastructure/Persistence/Migrations/`.
- Configure entities via `IEntityTypeConfiguration<T>` classes, not data annotations.
- The SQLite database file path should be configurable (default: `minipolls.db` inside a Docker volume).

### 5.2 Repositories

- Implement repository interfaces defined in Application.
- Keep repositories thin — they wrap EF Core queries. Business logic stays in Domain/Application.

---

## 6. API Layer (`MiniPolls.Api`)

### 6.1 Endpoints

Use **ASP.NET Controller-based** API controllers (not minimal APIs).

| Method | Route                              | Purpose                                   | Maps to                    |
| ------ | ---------------------------------- | ----------------------------------------- | -------------------------- |
| POST   | `/api/polls`                       | Create a new poll                          | `CreatePollCommand`        |
| GET    | `/api/polls/by-slug/{slug}`        | Get poll for voting (public)               | `GetPollBySlugQuery`       |
| GET    | `/api/polls/by-token/{token}`      | Get poll via management token (private)    | `GetPollByManagementTokenQuery` |
| PUT    | `/api/polls/{token}/expiration`    | Set/update expiration date                 | `SetPollExpirationCommand` |
| POST   | `/api/polls/{token}/close`         | Manually close a poll                      | `ClosePollCommand`         |
| POST   | `/api/polls/{slug}/votes`          | Cast a vote                                | `CastVoteCommand`          |
| GET    | `/api/polls/{slug}/results`        | Get aggregated results                     | `GetResultsQuery`          |
| GET    | `/api/polls/{slug}/vote-check`     | Check if current IP already voted          | `CheckVoteQuery`           |

### 6.2 IP Detection

- Read the voter's IP from `HttpContext.Connection.RemoteIpAddress`.
- Support `X-Forwarded-For` header when behind a reverse proxy (use `ForwardedHeadersMiddleware`).
- Pass the IP address as a parameter into the relevant MediatR command — the handler must not depend on `HttpContext`.

### 6.3 Response Conventions

- Return `201 Created` for successful poll creation (include the created resource location).
- Return `200 OK` for successful reads and updates.
- Return `400 Bad Request` with a structured error body for validation failures.
- Return `404 Not Found` for unknown slugs or tokens.
- Return `409 Conflict` when a duplicate vote is detected (include current results in body).
- Return `410 Gone` (or `409`) when attempting to vote on a closed/expired poll.

### 6.4 Middleware & Cross-Cutting

- Register `ForwardedHeadersMiddleware` before other middleware.
- Add a global exception handler middleware that returns structured `ProblemDetails` (RFC 7807).
- Configure CORS to allow the frontend origin (configurable via `appsettings.json`).

---

## 7. Configuration

Use `appsettings.json` / `appsettings.Development.json` and environment variables.

Key settings:

| Key                          | Description                            | Default                |
| ---------------------------- | -------------------------------------- | ---------------------- |
| `ConnectionStrings:Default`  | SQLite connection string               | `Data Source=minipolls.db` |
| `Cors:AllowedOrigins`        | Comma-separated frontend origins       | `http://localhost:3000` |
| `SlugGeneration:Length`      | Length of generated poll slugs         | `6`                    |

---

## 8. Testing

### 8.1 General Rules

- Use **xUnit** as the test framework.
- Use **FluentAssertions** for assertions.
- Follow the `Arrange / Act / Assert` pattern.
- Name tests: `MethodUnderTest_Scenario_ExpectedResult`.
- Keep unit tests fast — no database or network I/O.

### 8.2 Layer-Specific Testing

- **Domain.Tests** — test entity invariants and domain logic (pure unit tests).
- **Application.Tests** — test MediatR handlers with mocked repositories. Verify commands and query logic.
- **Infrastructure.Tests** — test repository implementations against an **in-memory SQLite** database.
- **Api.Tests** — integration tests using `WebApplicationFactory<Program>` to test endpoints end-to-end against an in-memory SQLite DB.

---

## 9. Code Style

- Use **file-scoped namespaces**.
- Use **primary constructors** where appropriate.
- Prefer **records** for DTOs and result types.
- Use `sealed` on classes that are not designed for inheritance.
- Async methods must return `Task` or `Task<T>` and have the `Async` suffix.
- Do **not** use `#region` blocks.
- Keep controllers thin — they only map HTTP concerns to MediatR calls.
- All public API models must be non-nullable by default; use nullable reference types (`<Nullable>enable</Nullable>`).

---

## 10. Docker

- The backend Dockerfile should use a **multi-stage build** (SDK image for build, ASP.NET runtime image for run).
- Expose port **8080** by default.
- The SQLite database file must be stored at a path mountable as a **Docker volume** (e.g., `/app/data/minipolls.db`).
- The Dockerfile lives at `backend/Dockerfile`.

---

## 11. Key Reminders

- **No authentication** — the app is anonymous by design. The management token in the URL is the only access control.
- **Short link generation and resolution** are self-hosted — do not use external URL shortener services.
- **IP-based duplicate prevention** is the only anti-fraud mechanism; accepted trade-off for a hobby project.
- Always validate on the **server side** even if the frontend validates too.
- Keep the API stateless — no server-side sessions.
