import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createPoll, getPollBySlug, castVote, checkVote, getResults, getPollByManagementToken, setPollExpiration, closePoll, ApiError } from '../../src/api/polls';

const mockFetch = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createPoll', () => {
  it('sends a POST to /polls with JSON body and Content-Type header', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          slug: 'abc12',
          managementToken: 'tok',
          votingUrl: 'http://example.com/p/abc12',
          managementUrl: 'http://example.com/manage/tok',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await createPoll({ question: 'Q?', options: ['A', 'B'] });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/polls$/);
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ question: 'Q?', options: ['A', 'B'] }));
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('returns parsed response on 201', async () => {
    const payload = {
      slug: 'abc12',
      managementToken: 'tok',
      votingUrl: 'http://example.com/p/abc12',
      managementUrl: 'http://example.com/manage/tok',
    };
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(payload), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await createPoll({ question: 'Q?', options: ['A', 'B'] });
    expect(result).toEqual(payload);
  });

  it('throws ApiError with status and body on 400', async () => {
    const errorBody = { title: 'Validation failed', errors: { Question: ['Question is required'] } };
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(errorBody), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(createPoll({ question: '', options: ['A', 'B'] })).rejects.toMatchObject({
      status: 400,
      body: errorBody,
    });
  });

  it('throws ApiError on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(createPoll({ question: 'Q?', options: ['A', 'B'] })).rejects.toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// getPollBySlug
// ---------------------------------------------------------------------------

describe('getPollBySlug', () => {
  const pollPayload = {
    id: 'poll-1',
    question: 'Favourite colour?',
    slug: 'fav-col',
    expiresAt: null,
    isClosed: false,
    createdAt: '2026-01-01T00:00:00Z',
    options: [
      { id: 'opt-1', text: 'Red', sortOrder: 0 },
      { id: 'opt-2', text: 'Blue', sortOrder: 1 },
    ],
  };

  it('sends GET to /polls/by-slug/{slug} with Content-Type header', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(pollPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await getPollBySlug('fav-col');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/polls\/by-slug\/fav-col$/);
    expect((init?.method ?? 'GET').toUpperCase()).not.toBe('POST');
    const headers = init?.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('returns parsed Poll on 200', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(pollPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await getPollBySlug('fav-col');
    expect(result).toEqual(pollPayload);
  });

  it('throws ApiError with status 404 when poll not found', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ title: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(getPollBySlug('missing')).rejects.toMatchObject({ status: 404 });
  });

  it('throws on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(getPollBySlug('fav-col')).rejects.toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// castVote
// ---------------------------------------------------------------------------

describe('castVote', () => {
  const voteResponse = {
    voteId: 'vote-1',
    pollOptionId: 'opt-1',
    castAt: '2026-01-01T12:00:00Z',
  };

  it('sends POST to /polls/{slug}/votes with JSON body containing optionId', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(voteResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await castVote('test1', { optionId: 'opt-1' });

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/polls\/test1\/votes$/);
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ optionId: 'opt-1' }));
  });

  it('returns CastVoteResponse on 200', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(voteResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await castVote('test1', { optionId: 'opt-1' });
    expect(result).toEqual(voteResponse);
  });

  it('throws ApiError with status 409 on duplicate vote', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ title: 'Already voted' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(castVote('test1', { optionId: 'opt-1' })).rejects.toMatchObject({ status: 409 });
  });

  it('throws ApiError with status 410 on closed poll', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ title: 'Poll closed' }), {
        status: 410,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(castVote('test1', { optionId: 'opt-1' })).rejects.toMatchObject({ status: 410 });
  });

  it('throws ApiError with status 404 on unknown slug', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ title: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(castVote('missing', { optionId: 'opt-1' })).rejects.toMatchObject({ status: 404 });
  });
});

// ---------------------------------------------------------------------------
// checkVote
// ---------------------------------------------------------------------------

describe('checkVote', () => {
  it('sends GET to /polls/{slug}/vote-check', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ hasVoted: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await checkVote('test1');

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/polls\/test1\/vote-check$/);
  });

  it('returns { hasVoted: false } when not voted', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ hasVoted: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await checkVote('test1');
    expect(result).toEqual({ hasVoted: false });
  });

  it('returns { hasVoted: true } when already voted', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ hasVoted: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await checkVote('test1');
    expect(result).toEqual({ hasVoted: true });
  });
});

// ---------------------------------------------------------------------------
// getResults
// ---------------------------------------------------------------------------

describe('getResults', () => {
  const resultsPayload = {
    question: 'Favourite colour?',
    isClosed: false,
    totalVotes: 3,
    options: [
      { id: 'opt-1', text: 'Red', voteCount: 2, percentage: 66.7 },
      { id: 'opt-2', text: 'Blue', voteCount: 1, percentage: 33.3 },
    ],
  };

  it('sends GET to /polls/{slug}/results', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(resultsPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await getResults('test1');

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/polls\/test1\/results$/);
  });

  it('returns parsed PollResults on 200', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(resultsPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await getResults('test1');
    expect(result).toEqual(resultsPayload);
  });

  it('throws ApiError with status 404 when poll not found', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ title: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(getResults('missing')).rejects.toMatchObject({ status: 404 });
  });
});

// ---------------------------------------------------------------------------
// getPollByManagementToken
// ---------------------------------------------------------------------------

describe('getPollByManagementToken', () => {
  const managementPollPayload = {
    id: 'poll-1',
    question: 'Best colour?',
    slug: 'col12',
    isClosed: false,
    expiresAt: null,
    closedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    totalVotes: 3,
    options: [
      { id: 'opt-1', text: 'Red', sortOrder: 0, voteCount: 2, percentage: 66.7 },
      { id: 'opt-2', text: 'Blue', sortOrder: 1, voteCount: 1, percentage: 33.3 },
    ],
  };

  it('sends GET to /polls/by-token/{token} with Content-Type header', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(managementPollPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await getPollByManagementToken('my-token');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/polls\/by-token\/my-token$/);
    expect((init?.method ?? 'GET').toUpperCase()).not.toBe('POST');
    const headers = init?.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('returns parsed ManagementPoll on 200', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(managementPollPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await getPollByManagementToken('my-token');
    expect(result).toEqual(managementPollPayload);
  });

  it('throws ApiError with status 404 when token not found', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ title: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(getPollByManagementToken('missing')).rejects.toMatchObject({ status: 404 });
  });

  it('throws on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(getPollByManagementToken('my-token')).rejects.toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// setPollExpiration
// ---------------------------------------------------------------------------

describe('setPollExpiration', () => {
  const setPollExpirationPayload = {
    id: 'poll-1',
    expiresAt: '2026-03-15T18:00:00Z',
  };

  it('sends PUT to /polls/{token}/expiration with JSON body containing expiresAt', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(setPollExpirationPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await setPollExpiration('my-token', { expiresAt: '2026-03-15T18:00:00Z' });

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/polls\/my-token\/expiration$/);
    expect(init.method).toBe('PUT');
    expect(init.body).toBe(JSON.stringify({ expiresAt: '2026-03-15T18:00:00Z' }));
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('returns parsed SetExpirationResponse on 200', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(setPollExpirationPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await setPollExpiration('my-token', { expiresAt: '2026-03-15T18:00:00Z' });
    expect(result).toEqual(setPollExpirationPayload);
  });

  it('throws ApiError with status 404 when token not found', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ title: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(
      setPollExpiration('missing', { expiresAt: '2026-03-15T18:00:00Z' }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('throws ApiError with status 400 on validation error (past date)', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ title: 'Validation failed', errors: { ExpiresAt: ['Past'] } }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(
      setPollExpiration('my-token', { expiresAt: '2020-01-01T00:00:00Z' }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('throws on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(
      setPollExpiration('my-token', { expiresAt: '2026-03-15T18:00:00Z' }),
    ).rejects.toThrow(TypeError);
  });
});

// ---------------------------------------------------------------------------
// closePoll
// ---------------------------------------------------------------------------

describe('closePoll', () => {
  const closePollPayload = {
    id: 'poll-1',
    isClosed: true,
    closedAt: '2026-02-27T12:00:00Z',
  };

  it('sends POST to /polls/{token}/close with no body', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(closePollPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await closePoll('my-token');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/polls\/my-token\/close$/);
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect(init.body).toBeUndefined();
  });

  it('returns parsed ClosePollResponse on 200', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(closePollPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await closePoll('my-token');
    expect(result).toEqual(closePollPayload);
  });

  it('throws ApiError with status 404 when token not found', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ title: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(closePoll('missing')).rejects.toMatchObject({ status: 404 });
  });

  it('throws on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(closePoll('my-token')).rejects.toThrow(TypeError);
  });
});
