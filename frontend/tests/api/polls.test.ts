import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createPoll, ApiError } from '../../src/api/polls';

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
