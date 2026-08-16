/**
 * Netlify Serverless Function: /api/ai
 *
 * Gemini-backed helpers for Dip Hunter. First action: monthly budget allocation.
 *
 * Env vars (Netlify Dashboard → Site configuration → Environment variables):
 *   GEMINI_API_KEY  → https://aistudio.google.com/apikey
 *   GEMINI_MODEL    → optional, default gemini-2.0-flash
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const DEFAULT_MODEL = 'gemini-2.0-flash';

const ALLOCATION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    description: {
      type: 'STRING',
      description: 'One-sentence summary of the allocation approach',
    },
    rationale: {
      type: 'STRING',
      description: '2-3 sentences explaining why this split fits a buy-the-dip plan',
    },
    riskProfile: {
      type: 'STRING',
      format: 'enum',
      enum: ['aggressive', 'balanced', 'conservative'],
    },
    expectedReturn: {
      type: 'STRING',
      description: 'Short expected-return style label, e.g. "12-18% if dips recover"',
    },
    allocations: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          symbol: { type: 'STRING' },
          allocation: {
            type: 'NUMBER',
            description: 'Amount in INR to allocate to this symbol',
          },
          reason: {
            type: 'STRING',
            description: 'Short reason for this symbol weight',
          },
        },
        required: ['symbol', 'allocation', 'reason'],
      },
    },
  },
  required: ['description', 'rationale', 'riskProfile', 'expectedReturn', 'allocations'],
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

function normalizeAllocations(stocks, budget, rawAllocations) {
  const bySymbol = new Map(stocks.map((s) => [s.symbol, s]));
  const cleaned = [];

  for (const row of rawAllocations ?? []) {
    const symbol = String(row?.symbol ?? '').trim().toUpperCase();
    const stock = bySymbol.get(symbol) ?? bySymbol.get(String(row?.symbol ?? '').trim());
    if (!stock) continue;
    const amount = Number(row.allocation);
    if (!Number.isFinite(amount) || amount < 0) continue;
    cleaned.push({
      symbol: stock.symbol,
      displayName: stock.displayName,
      allocation: amount,
      reason: String(row.reason || 'Gemini suggestion').slice(0, 160),
    });
  }

  // Ensure every requested stock appears; missing ones get 0 then we redistribute
  for (const stock of stocks) {
    if (!cleaned.some((c) => c.symbol === stock.symbol)) {
      cleaned.push({
        symbol: stock.symbol,
        displayName: stock.displayName,
        allocation: 0,
        reason: 'Filled to cover all red candidates',
      });
    }
  }

  const total = cleaned.reduce((sum, row) => sum + row.allocation, 0);
  if (total <= 0) {
    const equal = budget / stocks.length;
    return stocks.map((stock) => ({
      symbol: stock.symbol,
      displayName: stock.displayName,
      allocation: equal,
      percentage: (equal / budget) * 100,
      reason: 'Equal fallback — Gemini returned empty weights',
    }));
  }

  // Scale to exact budget
  const scaled = cleaned.map((row) => {
    const allocation = (row.allocation / total) * budget;
    return {
      ...row,
      allocation,
      percentage: (allocation / budget) * 100,
    };
  });

  // Fix rounding drift on the largest line
  const drift =
    budget - scaled.reduce((sum, row) => sum + row.allocation, 0);
  if (Math.abs(drift) > 0.01 && scaled.length > 0) {
    const richest = scaled.reduce((a, b) => (a.allocation >= b.allocation ? a : b));
    richest.allocation += drift;
    richest.percentage = (richest.allocation / budget) * 100;
  }

  return scaled;
}

function buildPrompt({ budget, stocks, currency }) {
  const lines = stocks.map((s) => {
    const change =
      typeof s.changePercent === 'number' ? `${s.changePercent.toFixed(2)}%` : 'n/a';
    const price = typeof s.price === 'number' ? s.price : 'n/a';
    const holding =
      typeof s.holdingQty === 'number' ? `${s.holdingQty} shares` : 'none';
    return `- ${s.symbol} (${s.displayName}): sector=${s.sector || 'Unknown'}, price=${price}, change=${change}, holding=${holding}`;
  });

  return [
    'You are an allocation assistant for Dip Hunter, an Indian NSE buy-the-dip planner.',
    'Allocate the monthly budget across ONLY the listed red-candidate stocks.',
    'Prefer diversification; do not put more than 40% in one symbol unless the list is tiny.',
    'Favor deeper dips only when the drop looks like a correction rather than a single-name collapse.',
    'Return INR amounts that sum to the budget. This is decision support, not financial advice.',
    '',
    `Currency: ${currency || 'INR'}`,
    `Budget: ${budget}`,
    'Candidates:',
    ...lines,
  ].join('\n');
}

async function callGeminiAllocate({ apiKey, model, budget, stocks, currency }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: buildPrompt({ budget, stocks, currency }) }],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: 'application/json',
        responseSchema: ALLOCATION_SCHEMA,
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      `Gemini HTTP ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned an empty allocation response');
  }

  return JSON.parse(text);
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonResponse(503, {
      error: 'Gemini is not configured',
      code: 'GEMINI_API_KEY_MISSING',
      hint: 'Set GEMINI_API_KEY in Netlify environment variables',
    });
  }

  let body;
  try {
    body = parseBody(event);
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const action = body.action || 'allocate';
  if (action !== 'allocate') {
    return jsonResponse(400, { error: `Unsupported action: ${action}` });
  }

  const budget = Number(body.budget);
  const stocks = Array.isArray(body.stocks) ? body.stocks : [];
  const currency = body.currency || 'INR';

  if (!Number.isFinite(budget) || budget <= 0) {
    return jsonResponse(400, { error: 'budget must be a positive number' });
  }
  if (stocks.length === 0) {
    return jsonResponse(400, { error: 'stocks must be a non-empty array' });
  }
  if (stocks.length > 30) {
    return jsonResponse(400, { error: 'stocks list is too large (max 30)' });
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  try {
    const raw = await callGeminiAllocate({
      apiKey,
      model,
      budget,
      stocks,
      currency,
    });

    const allocations = normalizeAllocations(stocks, budget, raw.allocations);
    const riskProfile = ['aggressive', 'balanced', 'conservative'].includes(
      raw.riskProfile
    )
      ? raw.riskProfile
      : 'balanced';

    return jsonResponse(200, {
      suggestion: {
        strategy: 'gemini',
        name: 'Gemini Advisor',
        description: String(raw.description || 'Gemini allocation for this month’s red candidates'),
        rationale: String(
          raw.rationale ||
            'Model-weighted split across red candidates for a buy-the-dip plan.'
        ),
        allocations,
        riskProfile,
        expectedReturn: String(raw.expectedReturn || 'Model estimate only'),
        provider: 'gemini',
        model,
        disclaimer: 'AI-assisted suggestion — not financial advice.',
      },
    });
  } catch (err) {
    console.error('[ai] Gemini allocate failed:', err.message);
    const status = err.status >= 400 && err.status < 600 ? err.status : 502;
    return jsonResponse(status, {
      error: err.message || 'Gemini allocation failed',
      code: 'GEMINI_ALLOCATE_FAILED',
    });
  }
}
