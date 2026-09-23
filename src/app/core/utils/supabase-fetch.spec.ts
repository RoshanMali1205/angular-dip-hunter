import { vi } from 'vitest';
import { createSupabaseFetch } from './supabase-fetch';

function jsonResponse(status: number, statusText: string): Response {
  return new Response(JSON.stringify({ message: statusText }), {
    status,
    statusText,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('createSupabaseFetch', () => {
  it('retries a gateway timeout and returns the next successful response', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(504, 'Gateway Timeout'))
      .mockResolvedValueOnce(jsonResponse(200, 'OK'));

    const supabaseFetch = createSupabaseFetch({
      fetchImpl,
      retryDelayMs: 0,
      timeoutMs: 1000,
    });

    const response = await supabaseFetch('https://example.supabase.co/auth/v1/token', {
      method: 'POST',
    });

    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('returns the gateway timeout after the last attempt', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(504, 'Gateway Timeout'));

    const supabaseFetch = createSupabaseFetch({
      fetchImpl,
      maxAttempts: 2,
      retryDelayMs: 0,
      timeoutMs: 1000,
    });

    const response = await supabaseFetch('https://example.supabase.co/auth/v1/token');

    expect(response.status).toBe(504);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not retry an invalid-credentials response', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(400, 'Bad Request'));

    const supabaseFetch = createSupabaseFetch({
      fetchImpl,
      retryDelayMs: 0,
      timeoutMs: 1000,
    });

    const response = await supabaseFetch('https://example.supabase.co/auth/v1/token');

    expect(response.status).toBe(400);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries a network failure and then surfaces gateway timeout when the attempt is aborted', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new DOMException('Aborted', 'AbortError'));

    const supabaseFetch = createSupabaseFetch({
      fetchImpl,
      maxAttempts: 1,
      retryDelayMs: 0,
      timeoutMs: 1000,
    });

    await expect(supabaseFetch('https://example.supabase.co/auth/v1/token')).rejects.toThrow(
      'Gateway Timeout'
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
