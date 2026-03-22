/**
 * Netlify Serverless Function: /api/quotes
 *
 * Fetches real-time NSE stock quotes directly from Yahoo Finance.
 * No npm dependencies — uses Node.js 18+ built-in fetch.
 *
 * Flow: get cookies → get crumb → batch quote request
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

  try {
    // Authenticate with Yahoo Finance
    const { crumb, cookieStr } = await getAuth();

    // Batch quote request
    const url =
      `https://query1.finance.yahoo.com/v7/finance/quote` +
      `?symbols=${encodeURIComponent(symbols.join(','))}` +
      `&crumb=${encodeURIComponent(crumb)}` +
      `&lang=en-US&region=IN&corsDomain=finance.yahoo.com`;

    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Cookie: cookieStr },
    });

    if (!res.ok) {
      // Crumb might be stale — clear cache and throw so caller can retry
      authCache = null;
      throw new Error(`Yahoo Finance returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const results = data?.quoteResponse?.result ?? [];

    if (results.length === 0) {
      throw new Error('Yahoo Finance returned empty result');
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
