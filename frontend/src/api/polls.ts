// Base URL is configured via the VITE_API_BASE_URL environment variable.
// Default: http://localhost:5218/api (local .NET dev server)
// Production: set VITE_API_BASE_URL as a Docker build arg at build time.
//
// All functions in this file are pure HTTP helpers — no UI logic or React state.
// They accept typed parameters and return typed responses.
// Non-2xx responses throw a structured ApiError.

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5218/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`API error: ${status}`);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw new ApiError(response.status, body);
  }

  // 204 No Content — return undefined cast as T
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

import type { CreatePollRequest, CreatePollResponse } from '../types/poll';

// ---------------------------------------------------------------------------
// Polls
// ---------------------------------------------------------------------------

/** POST /api/polls — Create a new poll */
export function createPoll(data: CreatePollRequest): Promise<CreatePollResponse> {
  return request<CreatePollResponse>('/polls', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// GET  /api/polls/by-slug/{slug} — Load poll for voting page
// GET  /api/polls/by-token/{token} — Load poll for management page
// PUT  /api/polls/{token}/expiration — Set/update expiration
// POST /api/polls/{token}/close — Close a poll

// ---------------------------------------------------------------------------
// Votes
// ---------------------------------------------------------------------------

// POST /api/polls/{slug}/votes — Cast a vote
// GET  /api/polls/{slug}/results — Get aggregated results
// GET  /api/polls/{slug}/vote-check — Check if current IP already voted

export { request };
