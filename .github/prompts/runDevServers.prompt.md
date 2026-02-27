---
name: runDevServers
description: Start backend and frontend dev servers, verify both are up, and open the app.
argument-hint: Optional port numbers or startup commands if they differ from project defaults.
---
Start the backend and frontend development servers for the current project.

Steps to follow:
1. Inspect the project structure to identify the backend and frontend folders, tech stack, and default ports (check config files such as `launchSettings.json`, `vite.config.ts`, `package.json`, `.env`, etc.).
2. Kill any existing processes that may be holding the required ports or locking build output files.
3. Start the backend server as a **background** process.
4. Confirm the backend is listening on its expected port (e.g., via `netstat`) before proceeding.
5. Start the frontend dev server as a **background** process.
6. Confirm the frontend is ready by checking terminal output for the local URL.
7. Open the running application in the browser.
8. Report the URLs for both services and summarise what functionality is currently available to test.
