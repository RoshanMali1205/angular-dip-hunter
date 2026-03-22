/**
 * Netlify Serverless Function: /api/quotes
 *
 * Fetches real-time stock quotes from Yahoo Finance using yahoo-finance2.
 * Called by the Angular QuoteService when quoteDataSource is set to 'yahoo'.
 *
 * Query params:
 *   symbols — comma-separated Yahoo Finance symbols (e.g. RELIANCE.NS,TCS.NS)
 */

import yahooFinance from 'yahoo-finance2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler = async (event) => {
  // Handle CORS preflight
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
  const quotes = {};
  const errors = [];
  let successCount = 0;

  // Fetch all symbols in parallel
  await Promise.allSettled(
    symbols.map(async (yahooSymbol) => {
      try {
        const data = await yahooFinance.quote(yahooSymbol, {}, { validateResult: false });

        // Strip exchange suffix to get base symbol (e.g. RELIANCE.NS → RELIANCE)
        const baseSymbol = yahooSymbol.replace(/\.(NS|BSE|BO)$/i, '');

        quotes[yahooSymbol] = {
          symbol: baseSymbol,
          yahooSymbol,
          price: data.regularMarketPrice ?? 0,
          previousClose: data.regularMarketPreviousClose ?? 0,
          change: data.regularMarketChange ?? 0,
          changePercent: data.regularMarketChangePercent ?? 0,
          dayHigh: data.regularMarketDayHigh ?? 0,
          dayLow: data.regularMarketDayLow ?? 0,
          volume: data.regularMarketVolume ?? 0,
          fiftyTwoWeekHigh: data.fiftyTwoWeekHigh ?? 0,
          fiftyTwoWeekLow: data.fiftyTwoWeekLow ?? 0,
          currency: data.currency ?? 'INR',
          name: data.shortName ?? data.longName ?? baseSymbol,
          timestamp,
          source: 'yahoo',
        };
        successCount++;
      } catch (err) {
        console.error(`[quotes] Failed to fetch ${yahooSymbol}:`, err.message);
        errors.push({ symbol: yahooSymbol, error: err.message });
      }
    })
  );

  const body = {
    quotes,
    meta: {
      requested: symbols.length,
      success: successCount,
      cached: 0,
      fetched: successCount,
      errors: errors.length,
      timestamp,
    },
  };

  if (errors.length > 0) {
    body.errors = errors;
  }

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
};
