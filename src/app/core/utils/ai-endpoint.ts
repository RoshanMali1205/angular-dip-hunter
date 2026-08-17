/**
 * Resolve the Gemini /api/ai endpoint.
 * Prefer /.netlify/functions/ai on same origin so the SPA catch-all cannot swallow the request.
 */
export function resolveAiEndpoint(proxyBaseUrl?: string | null): string {
  return proxyBaseUrl ? `${proxyBaseUrl}/api/ai` : '/.netlify/functions/ai';
}
