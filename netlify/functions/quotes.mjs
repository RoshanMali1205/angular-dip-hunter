/**
 * Netlify Serverless Function: /api/quotes
 *
 * Fetches real-time NSE stock quotes directly from Yahoo Finance.
 * No npm dependencies — uses Node.js 18+ built-in fetch.
 *
 * Strategy:
 *   1. Try query2 without crumb (fast path, ~1s)
 *   2. If blocked, fall back to cookie+crumb auth via query1 (~3-5s)
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Cache crumb in Lambda memory (~25 min lifetime)
let authCache = null;

async function getAuth() {
  if (authCache && Date.now() - authCache.time < 25 * 60 * 1000) {
    return authCache;
  }

  // Step 1: hit Yahoo Finance consent page to get session cookies
  const cookieRes = await fetch('https://fc.yahoo.com', {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    redirect: 'follow',
  });

  // Collect all Set-Cookie values and extract name=value pairs only
  const rawCookie = cookieRes.headers.get('set-cookie') || '';
  const cookieStr = rawCookie
    .split(/,\s*(?=[A-Za-z0-9_-]+=)/) // split on comma that starts a new cookie
    .map((c) => c.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');

  // Step 2: exchange cookies for a crumb token
  const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': UA, Cookie: cookieStr },
  });
  const crumb = await crumbRes.text();

  if (!crumb || crumb.length < 2 || crumb.startsWith('<') || crumb === 'Not Found') {
    throw new Error(`Could not get Yahoo Finance crumb (got: "${crumb}")`);
  }

  authCache = { crumb: crumb.trim(), cookieStr, time: Date.now() };
  return authCache;
}

/**
 * Fast path: try query2 without crumb auth.
 * Works intermittently — Yahoo doesn't always enforce crumb on query2.
 */
async function fetchWithoutCrumb(symbolsJoined) {
  const url =
    `https://query2.finance.yahoo.com/v7/finance/quote` +
    `?symbols=${encodeURIComponent(symbolsJoined)}` +
    `&lang=en-US&region=IN&corsDomain=finance.yahoo.com`;

  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  });

  if (!res.ok) throw new Error(`query2 returned HTTP ${res.status}`);

  const data = await res.json();
  const results = data?.quoteResponse?.result ?? [];
  if (results.length === 0) throw new Error('query2 returned empty results');

  return results;
}

/**
 * Slow path: full cookie+crumb auth via query1.
 */
async function fetchWithCrumb(symbolsJoined) {
  const { crumb, cookieStr } = await getAuth();

  const url =
    `https://query1.finance.yahoo.com/v7/finance/quote` +
    `?symbols=${encodeURIComponent(symbolsJoined)}` +
    `&crumb=${encodeURIComponent(crumb)}` +
    `&lang=en-US&region=IN&corsDomain=finance.yahoo.com`;

  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Cookie: cookieStr },
  });

  if (!res.ok) {
    authCache = null; // invalidate stale crumb
    throw new Error(`query1 returned HTTP ${res.status}`);
  }

  const data = await res.json();
  const results = data?.quoteResponse?.result ?? [];
  if (results.length === 0) throw new Error('query1 returned empty results');

  return results;
}

export const handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  const symbolsParam = event.queryStringParameters?.symbols;
  if (!symbolsParam) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Missing required query param: symbols' }),
    };
  }

  const symbols = symbolsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (symbols.length === 0) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'No valid symbols provided' }),
    };
  }

  const timestamp = new Date().toISOString();
  const symbolsJoined = symbols.join(',');

  try {
    // Try fast path first, fall back to crumb auth
    let results;
    let usedFastPath = false;

    try {
      results = await fetchWithoutCrumb(symbolsJoined);
      usedFastPath = true;
      console.log(`[quotes] Fast path OK — ${results.length} symbols`);
    } catch (fastErr) {
      console.log(`[quotes] Fast path failed (${fastErr.message}), trying crumb auth...`);
      results = await fetchWithCrumb(symbolsJoined);
      console.log(`[quotes] Crumb path OK — ${results.length} symbols`);
    }

    // Build response in the shape Angular's QuoteService expects
    const quotes = {};
    let successCount = 0;

    for (const item of results) {
      const yahooSymbol = item.symbol; // e.g. "RELIANCE.NS"
      const baseSymbol = yahooSymbol.replace(/\.(NS|BSE|BO)$/i, '');

      quotes[yahooSymbol] = {
        symbol: baseSymbol,
        yahooSymbol,
        price: item.regularMarketPrice ?? 0,
        previousClose: item.regularMarketPreviousClose ?? 0,
        change: item.regularMarketChange ?? 0,
        changePercent: item.regularMarketChangePercent ?? 0,
        dayHigh: item.regularMarketDayHigh ?? 0,
        dayLow: item.regularMarketDayLow ?? 0,
        volume: item.regularMarketVolume ?? 0,
        fiftyTwoWeekHigh: item.fiftyTwoWeekHigh ?? 0,
        fiftyTwoWeekLow: item.fiftyTwoWeekLow ?? 0,
        currency: item.currency ?? 'INR',
        name: item.shortName ?? item.longName ?? baseSymbol,
        timestamp,
        source: 'yahoo',
      };
      successCount++;
    }

    // Symbols that came back with no data
    const returnedSet = new Set(results.map((r) => r.symbol));
    const errors = symbols
      .filter((s) => !returnedSet.has(s))
      .map((s) => ({ symbol: s, error: 'No data returned by Yahoo Finance' }));

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        quotes,
        meta: {
          requested: symbols.length,
          success: successCount,
          cached: 0,
          fetched: successCount,
          errors: errors.length,
          timestamp,
          path: usedFastPath ? 'fast' : 'crumb',
        },
        ...(errors.length > 0 ? { errors } : {}),
      }),
    };
  } catch (err) {
    console.error('[quotes] Error:', err.message);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
