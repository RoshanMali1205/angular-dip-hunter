/**
 * Netlify Serverless Function: /api/quotes
 *
 * Fetch strategy (in order):
 *   1. Finnhub API  — if FINNHUB_API_KEY env var is set (recommended)
 *   2. Yahoo Finance — cookie+crumb fallback when no Finnhub key is configured
 *
 * To use Finnhub:
 *   Netlify Dashboard → Site → Environment variables → Add FINNHUB_API_KEY
 *   Get a free key (no credit card) at: https://finnhub.io/register
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

// ─── Finnhub ────────────────────────────────────────────────────────────────

/**
 * Fetch all symbols from Finnhub in parallel.
 * Each symbol is fetched individually (no batch endpoint on free tier).
 * 60 req/min limit — well within range for 30 stocks.
 */
async function fetchFromFinnhub(symbols, apiKey) {
  const requests = symbols.map(async (yahooSymbol) => {
    try {
      const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(yahooSymbol)}&token=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      // c === 0 means market closed or symbol not found — skip
      if (!data || data.c === 0) return null;
      return { yahooSymbol, data };
    } catch {
      return null;
    }
  });

  const settled = await Promise.allSettled(requests);
  return settled
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);
}

// ─── Yahoo Finance (fallback) ────────────────────────────────────────────────

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

let authCache = null;

async function getAuth() {
  if (authCache && Date.now() - authCache.time < 25 * 60 * 1000) {
    return authCache;
  }
  const cookieRes = await fetch('https://fc.yahoo.com', {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    redirect: 'follow',
  });
  const rawCookie = cookieRes.headers.get('set-cookie') || '';
  const cookieStr = rawCookie
    .split(/,\s*(?=[A-Za-z0-9_-]+=)/)
    .map((c) => c.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');
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

async function fetchWithoutCrumb(symbolsJoined) {
  const url =
    `https://query2.finance.yahoo.com/v7/finance/quote` +
    `?symbols=${encodeURIComponent(symbolsJoined)}` +
    `&lang=en-US&region=IN&corsDomain=finance.yahoo.com`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`query2 returned HTTP ${res.status}`);
  const data = await res.json();
  const results = data?.quoteResponse?.result ?? [];
  if (results.length === 0) throw new Error('query2 returned empty results');
  return results;
}

async function fetchWithCrumb(symbolsJoined) {
  const { crumb, cookieStr } = await getAuth();
  const url =
    `https://query1.finance.yahoo.com/v7/finance/quote` +
    `?symbols=${encodeURIComponent(symbolsJoined)}` +
    `&crumb=${encodeURIComponent(crumb)}` +
    `&lang=en-US&region=IN&corsDomain=finance.yahoo.com`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Cookie: cookieStr } });
  if (!res.ok) {
    authCache = null;
    throw new Error(`query1 returned HTTP ${res.status}`);
  }
  const data = await res.json();
  const results = data?.quoteResponse?.result ?? [];
  if (results.length === 0) throw new Error('query1 returned empty results');
  return results;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export const handler = async (event) => {
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

  const symbols = symbolsParam.split(',').map((s) => s.trim()).filter(Boolean);
  if (symbols.length === 0) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'No valid symbols provided' }),
    };
  }

  const timestamp = new Date().toISOString();
  const finnhubKey = process.env.FINNHUB_API_KEY;

  try {
    const quotes = {};
    let source = 'yahoo';

    // ── Path 1: Finnhub (when FINNHUB_API_KEY env var is set) ──────────────
    if (finnhubKey) {
      source = 'finnhub';
      console.log(`[quotes] Using Finnhub for ${symbols.length} symbols`);

      const results = await fetchFromFinnhub(symbols, finnhubKey);

      for (const { yahooSymbol, data } of results) {
        const baseSymbol = yahooSymbol.replace(/\.(NS|BSE|BO)$/i, '');
        quotes[yahooSymbol] = {
          symbol: baseSymbol,
          yahooSymbol,
          price: data.c,
          previousClose: data.pc,
          change: data.d ?? 0,
          changePercent: data.dp ?? 0,
          dayHigh: data.h,
          dayLow: data.l,
          volume: 0,           // not in Finnhub /quote endpoint
          fiftyTwoWeekHigh: 0,
          fiftyTwoWeekLow: 0,
          currency: 'INR',
          name: baseSymbol,
          timestamp,
          source: 'finnhub',
        };
      }

      console.log(`[quotes] Finnhub OK — ${Object.keys(quotes).length}/${symbols.length} symbols`);
    }

    // ── Path 2: Yahoo Finance fallback ─────────────────────────────────────
    else {
      source = 'yahoo';
      console.log(`[quotes] No FINNHUB_API_KEY set — falling back to Yahoo Finance`);

      const symbolsJoined = symbols.join(',');
      let results;

      try {
        results = await fetchWithoutCrumb(symbolsJoined);
        console.log(`[quotes] Yahoo fast path OK — ${results.length} symbols`);
      } catch (fastErr) {
        console.log(`[quotes] Yahoo fast path failed (${fastErr.message}), trying crumb auth...`);
        results = await fetchWithCrumb(symbolsJoined);
        console.log(`[quotes] Yahoo crumb path OK — ${results.length} symbols`);
      }

      for (const item of results) {
        const yahooSymbol = item.symbol;
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
      }
    }

    const successCount = Object.keys(quotes).length;
    const returnedSet = new Set(Object.keys(quotes));
    const errors = symbols
      .filter((s) => !returnedSet.has(s))
      .map((s) => ({ symbol: s, error: `No data from ${source}` }));

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
          source,
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
