/**
 * Netlify Serverless Function: /api/ai
 *
 * Gemini-backed helpers for Dip Hunter (allocate + predict).
 */

import { handleAiRequest } from './ai-core.mjs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

function parseBody(event) {
  if (!event.body) return {};
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;
  return JSON.parse(raw);
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod === 'GET') {
    const result = await handleAiRequest({ action: 'status' }, process.env);
    return jsonResponse(result.statusCode, result.body);
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  let body;
  try {
    body = parseBody(event);
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const result = await handleAiRequest(body, process.env);
  return jsonResponse(result.statusCode, result.body);
}
