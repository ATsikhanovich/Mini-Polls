# MP-001 Backend — Create a Poll

## TL;DR

Implement the `POST /api/polls` endpoint end-to-end. The Domain entities, Infrastructure (DbContext, repositories, migrations), and DI wiring are already in place. The work spans three areas: (1) Application layer — `CreatePollCommand`, handler, validator, result DTO, and a slug/token generation helper; (2) API layer — `PollsController` with a single `POST` action; (3) Middleware fix — add `DomainException` → 400 mapping. Tests cover the handler + validator (Application.Tests) and the endpoint (Api.Tests).

## Steps

1. **Create slug & token generation helper** — Add a new static class `SlugGenerator` in `src/MiniPolls.Application/Polls/Services/SlugGenerator.cs`. Two static methods:
   - `GenerateSlug(int length)` — returns a random alphanumeric string (a-z, A-Z, 0-9) of the given length using `Random.Shared`.
   - `GenerateManagementToken()` — returns a 32-byte cryptographically random URL-safe Base64 string using `System.Security.Cryptography.RandomNumberGenerator` (produces ~43 characters, satisfying the ≥32-char domain rule).

2. **Create `CreatePollResult` DTO** — Add a new record in `src/MiniPolls.Application/Polls/CreatePoll/CreatePollResult.cs`:
   - Properties: `Guid Id`, `string Slug`, `string ManagementToken`, `DateTimeOffset CreatedAt`, `DateTimeOffset? ExpiresAt`.
   - The API layer constructs full URLs from `Slug` and `ManagementToken`; the Application layer returns raw values only.

3. **Create `CreatePollCommand`** — Add a new record in `src/MiniPolls.Application/Polls/CreatePoll/CreatePollCommand.cs`:
   - Implements `IRequest<CreatePollResult>`.
   - Properties: `string Question`, `IReadOnlyList<string> Options`, `DateTimeOffset? ExpiresAt`.

4. **Create `CreatePollCommandValidator`** — Add a FluentValidation validator in `src/MiniPolls.Application/Polls/CreatePoll/CreatePollCommandValidator.cs`:
   - `Question` must not be empty/whitespace.
   - `Options` must not be null, must have at minimum 2 items.
   - Each option text must not be empty/whitespace (use `RuleForEach`).
   - `ExpiresAt`, if provided, must be in the future.
   - Runs automatically before the handler via the existing `ValidationBehaviour` pipeline.

5. **Create `CreatePollCommandHandler`** — Add the handler in `src/MiniPolls.Application/Polls/CreatePoll/CreatePollCommandHandler.cs`:
   - Inject `IPollRepository` and `IConfiguration` (to read `SlugGeneration:Length`, defaulting to 6).
   - Generate a slug via `SlugGenerator.GenerateSlug(length)`, then call `IPollRepository.SlugExistsAsync()` in a loop to ensure uniqueness (retry with a new slug on collision; cap retries at ~10, throw if exhausted).
   - Generate a management token via `SlugGenerator.GenerateManagementToken()`.
   - Call `Poll.Create(command.Question, command.Options, slug, managementToken, command.ExpiresAt)`.
   - Call `IPollRepository.AddAsync(poll, cancellationToken)`.
   - Return a `CreatePollResult` populated from the created `Poll` entity.

6. **Create `PollsController`** — Add a new controller in `src/MiniPolls.Api/Controllers/PollsController.cs`:
   - Attributes: `[ApiController]`, `[Route("api/polls")]`.
   - Inject `IMediator`.
   - Define a `CreatePollRequest` record (nested or separate file) with properties `string Question`, `List<string> Options`, `DateTimeOffset? ExpiresAt` — this is the API-specific input shape, decoupled from the MediatR command.
   - `POST` action on route `""` — accepts `CreatePollRequest` body, maps to `CreatePollCommand`, sends via MediatR, returns `201 Created` with `CreatePollResult` in the body and a `Location` header pointing to `/api/polls/by-slug/{slug}`.

7. **Update `ExceptionHandlingMiddleware`** — In `src/MiniPolls.Api/Middleware/ExceptionHandlingMiddleware.cs`:
   - Add a catch clause for `DomainException` before the generic `Exception` catch.
   - Return `400 Bad Request` with a `ProblemDetails` body containing the domain exception message in the `detail` field.

8. **Delete `.gitkeep`** — Remove the `.gitkeep` placeholder from `src/MiniPolls.Application/Polls/CreatePoll/` once real files are added.

9. **Application Tests** — Add tests in `tests/MiniPolls.Application.Tests/`:
   - Add **NSubstitute** NuGet package to `MiniPolls.Application.Tests.csproj` for mocking.
   - **`Polls/CreatePoll/CreatePollCommandHandlerTests.cs`**:
     - `HandleAsync_ValidCommand_CreatesPollAndReturnsResult` — mock `IPollRepository` (verify `AddAsync` called with correct `Poll`, `SlugExistsAsync` returns false); assert result contains non-empty slug, management token, and correct data.
     - `HandleAsync_SlugCollision_RetriesAndSucceeds` — mock `SlugExistsAsync` to return true first, then false; verify poll is still created.
     - `HandleAsync_ValidCommand_GeneratesTokenOfMinLength32` — assert management token length ≥ 32.
   - **`Polls/CreatePoll/CreatePollCommandValidatorTests.cs`**:
     - `Validate_EmptyQuestion_Fails`
     - `Validate_FewerThanTwoOptions_Fails`
     - `Validate_EmptyOptionText_Fails`
     - `Validate_PastExpiration_Fails`
     - `Validate_ValidCommand_Passes`

10. **API Integration Tests** — Add tests in `tests/MiniPolls.Api.Tests/`:
    - **`Polls/CreatePollEndpointTests.cs`** using `WebApplicationFactory<Program>`:
      - `Post_ValidPoll_Returns201WithSlugAndToken` — send valid JSON, assert 201 status, response body contains `slug` and `managementToken`, `Location` header is set.
      - `Post_EmptyQuestion_Returns400ValidationError` — assert 400 with validation problem details.
      - `Post_SingleOption_Returns400ValidationError` — assert 400.
      - `Post_ValidPoll_PersistsToDatabase` — after creation, resolve a scoped `MiniPollsDbContext` from the test server and verify the poll exists in the database.
    - Configure `WebApplicationFactory` to use in-memory SQLite (override `ConfigureWebHost`, replace connection string with `DataSource=:memory:`, ensure migrations are applied on the open connection).

## Verification

- `dotnet build` from `backend/` — zero errors, zero warnings.
- `dotnet test` from `backend/` — all existing Domain tests pass, plus all new Application and API tests pass.
- Manual: `POST http://localhost:5062/api/polls` with body `{ "question": "Where to eat?", "options": ["Pizza", "Sushi", "Tacos"] }` → 201 response with `slug` and `managementToken`.

## Decisions

- **Slug generation in Application layer**: Static helper `SlugGenerator` — pure function, no I/O, no need for an interface or Infrastructure placement.
- **Management token**: `RandomNumberGenerator` + Base64url encoding → 43 characters from 32 bytes; cryptographically safe.
- **API request DTO**: Separate `CreatePollRequest` record at the API layer, mapped to `CreatePollCommand` in the controller — keeps MediatR commands decoupled from serialization concerns.
- **DomainException middleware**: Included in this plan since `Poll.Create()` throws for invariant violations that may pass FluentValidation (defense in depth).
- **Mocking library**: NSubstitute — lightweight, fits minimal dependency philosophy.
- **No Infrastructure tests**: The repository is a thin EF Core wrapper; API integration tests cover the real persistence path via in-memory SQLite.
