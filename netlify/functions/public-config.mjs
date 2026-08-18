/**
 * Public runtime config for the Angular SPA.
 * Returns only the Supabase project URL and anon key from Netlify env.
 * Never include service_role here.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=60',
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const supabaseUrl = String(process.env.SUPABASE_URL || '').trim().replace(/^['"]|['"]$/g, '');
  const supabaseAnonKey = String(process.env.SUPABASE_ANON_KEY || '')
    .trim()
    .replace(/^['"]|['"]$/g, '');

  return jsonResponse(200, {
    supabaseUrl,
    supabaseAnonKey,
    configured: Boolean(supabaseUrl && supabaseAnonKey),
  });
}
