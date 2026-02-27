# Mini-Polls

Mini-Polls is a lightweight polling app with a React frontend and a .NET backend.

## Run with Docker Compose

### Prerequisites

- Docker Desktop (or Docker Engine + Compose v2)

### Start the application

From the repository root:

```bash
docker compose up --build
```

Services:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080/api

### Optional: override host ports (if 8080/3000 are in use)

Create a `.env` file in the repository root (or export env vars in your shell):

```env
BACKEND_HOST_PORT=18080
FRONTEND_HOST_PORT=13000
VITE_API_BASE_URL=http://localhost:18080/api
```

Then run:

```bash
docker compose up --build
```

With the example above:

- Frontend: http://localhost:13000
- Backend API: http://localhost:18080/api

### Persistence (SQLite)

The backend stores SQLite at `/app/data/minipolls.db` inside the container.

Docker Compose mounts a named volume (`minipolls-data`) to `/app/data`, so poll data persists across container restarts and rebuilds.

### Stop the application

```bash
docker compose down
```

To also remove persisted database data:

```bash
docker compose down -v
```