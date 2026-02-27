---
name: runDevServers
description: Start backend and frontend dev servers, verify both are up, and open the app.
argument-hint: Optional port numbers or startup commands if they differ from project defaults.
tools: [read, search, execute]
---
model: Grok Code Fast 1
---
Start the backend and frontend development servers for the current project.

Steps to follow:
1. Inspect the project structure to identify the backend and frontend folders, tech stack, and default ports (check config files such as `launchSettings.json`, `vite.config.ts`, `package.json`, `.env`, etc.).
2. Kill any existing processes that may be holding the required ports **or locking build output files**:
   - Kill by process name first (e.g., `Get-Process dotnet | Stop-Process -Force` for .NET, or processes named after the project). This handles DLL/binary file locks that survive port release.
   - Then kill any remaining processes still bound to the required ports via `netstat -ano`.
   - Wait 2–3 seconds after killing to let the OS release file handles before proceeding.
3. Start the backend server as a **background** process.
4. Confirm the backend is ready before proceeding:
   - Check `netstat` to verify the port is in LISTENING state.
   - Send a lightweight HTTP probe (e.g., `Invoke-WebRequest` or `curl`) to a known endpoint such as `/api/health` or the Swagger UI. If no health endpoint exists, a 404 response still confirms the server is accepting connections.
   - If the build fails due to locked files (e.g., MSB3027 "file locked by PID X"), extract that PID from the error output, kill it, and retry the build once before escalating.
5. Start the frontend dev server as a **background** process.
6. Confirm the frontend is ready by checking terminal output for the local URL (e.g., `Local: http://localhost:3000/`).
7. Open the running application in the browser.
8. Report the URLs for both services and summarise what functionality is currently available to test.
