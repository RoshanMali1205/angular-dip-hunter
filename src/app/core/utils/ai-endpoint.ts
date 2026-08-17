/**
 * Resolve the Gemini /api/ai endpoint.
 *
 * Production (Netlify / custom domain) always uses the same-origin function so a
 * quotes-only yahooProxyUrl cannot send chat to a host that has no GEMINI_API_KEY.
 * Localhost still follows the quotes proxy, which also exposes /api/ai.
 */
export function resolveAiEndpoint(proxyBaseUrl?: string | null): string {
  const base = (proxyBaseUrl || '').trim().replace(/\/$/, '');
  if (!isLocalDevHost()) {
    return '/.netlify/functions/ai';
  }
  return base ? `${base}/api/ai` : '/.netlify/functions/ai';
}

function isLocalDevHost(): boolean {
  try {
    const host = globalThis.location?.hostname ?? '';
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  } catch {
    return false;
  }
}
