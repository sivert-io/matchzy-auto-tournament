const DEFAULT_TIMEOUT_MS = 8000;

type FetchInput = Parameters<typeof fetch>[0];

/**
 * fetch() that rejects if the server does not respond within `timeoutMs`.
 * Prevents infinite loading when the API is down or the Vite proxy hangs.
 */
export async function fetchWithTimeout(
  input: FetchInput,
  init?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new globalThis.AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
