/**
 * Fetch wrapper for the Supabase client.
 *
 * The project gateway returns HTTP 504 (status text "Gateway Timeout") when
 * Auth or Postgres is waking up or briefly unreachable. Those responses are
 * safe to retry. A per-attempt timeout stops the sign-in button spinning
 * until the browser gives up.
 */

const RETRYABLE_STATUS = new Set([502, 503, 504, 544]);

export const SUPABASE_FETCH_TIMEOUT_MS = 20_000;
export const SUPABASE_FETCH_ATTEMPTS = 2;
export const SUPABASE_FETCH_RETRY_DELAY_MS = 600;

export interface SupabaseFetchOptions {
  timeoutMs?: number;
  maxAttempts?: number;
  retryDelayMs?: number;
  fetchImpl?: typeof fetch;
}

export function createSupabaseFetch(options: SupabaseFetchOptions = {}): typeof fetch {
  const timeoutMs = options.timeoutMs ?? SUPABASE_FETCH_TIMEOUT_MS;
  const maxAttempts = options.maxAttempts ?? SUPABASE_FETCH_ATTEMPTS;
  const retryDelayMs = options.retryDelayMs ?? SUPABASE_FETCH_RETRY_DELAY_MS;
  const fetchImpl = options.fetchImpl ?? ((input, init) => globalThis.fetch(input, init));

  return async (input, init) => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const parentSignal = init?.signal;
      const onParentAbort = () => controller.abort();
      if (parentSignal) {
        if (parentSignal.aborted) controller.abort();
        else parentSignal.addEventListener('abort', onParentAbort, { once: true });
      }

      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(input, { ...init, signal: controller.signal });
        if (RETRYABLE_STATUS.has(response.status) && attempt < maxAttempts) {
          await delay(retryDelayMs * attempt);
          continue;
        }
        return response;
      } catch (error) {
        lastError = error;
        if (parentSignal?.aborted || attempt >= maxAttempts) {
          if (!parentSignal?.aborted && isAbortError(error)) {
            throw new Error('Gateway Timeout');
          }
          throw error;
        }
        await delay(retryDelayMs * attempt);
      } finally {
        clearTimeout(timer);
        parentSignal?.removeEventListener('abort', onParentAbort);
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Gateway Timeout');
  };
}

export const supabaseFetch = createSupabaseFetch();

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error && error.name === 'AbortError';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
