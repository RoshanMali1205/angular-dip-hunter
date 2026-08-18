/**
 * Shared Gemini helpers for Dip Hunter.
 * Used by the Netlify function and the local Express proxy.
 *
 * Env vars:
 *   GEMINI_API_KEY  → https://aistudio.google.com/apikey
 *   GEMINI_MODEL    → optional, default gemini-3.5-flash
 *
 * gemini-2.0-flash was shut down 1 June 2026. If GEMINI_MODEL still points
 * at a retired id, we retry current Flash models automatically.
 */

import { nseBsePromptSnippet } from './nse-bse-knowledge.mjs';

const DEFAULT_MODEL = 'gemini-3.5-flash';
const FALLBACK_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-2.5-flash',
  'gemini-flash-latest',
];
const DISCLAIMER = 'AI-assisted suggestion — not financial advice.';

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

const PREDICT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    summary: {
      type: 'STRING',
      description: 'One or two sentences on overall dip quality today',
    },
    marketTone: {
      type: 'STRING',
      format: 'enum',
      enum: ['risk-on', 'cautious', 'defensive'],
    },
    picks: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          symbol: { type: 'STRING' },
          score: {
            type: 'NUMBER',
            description: 'Dip attractiveness 0-100 (higher = better buy-the-dip candidate)',
          },
          action: {
            type: 'STRING',
            format: 'enum',
            enum: ['buy', 'watch', 'skip'],
          },
          confidence: {
            type: 'STRING',
            format: 'enum',
            enum: ['high', 'medium', 'low'],
          },
          dropType: {
            type: 'STRING',
            format: 'enum',
            enum: ['technical', 'sector-wide', 'news-based', 'correction', 'unknown'],
          },
          rationale: {
            type: 'STRING',
            description: 'Short reason this dip is or is not attractive',
          },
          riskNote: {
            type: 'STRING',
            description: 'Main risk if buying here',
          },
        },
        required: [
          'symbol',
          'score',
          'action',
          'confidence',
          'dropType',
          'rationale',
          'riskNote',
        ],
      },
    },
  },
  required: ['summary', 'marketTone', 'picks'],
};

function readApiKey(env) {
  return String(env?.GEMINI_API_KEY || '')
    .trim()
    .replace(/^['"]|['"]$/g, '');
}

function modelCandidates(env) {
  const preferred = String(env?.GEMINI_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  return [preferred, ...FALLBACK_MODELS.filter((id) => id !== preferred)];
}

function isRetryableModelError(err) {
  const status = err?.status;
  const msg = String(err?.message || '').toLowerCase();
  return (
    status === 404 ||
    msg.includes('not found') ||
    msg.includes('not supported') ||
    msg.includes('no longer available') ||
    msg.includes('has been shut down') ||
    msg.includes('is not available')
  );
}

async function withModelFallback(env, invoke) {
  const models = modelCandidates(env);
  let lastErr;
  for (const model of models) {
    try {
      const data = await invoke(model);
      return { data, model };
    } catch (err) {
      lastErr = err;
      if (!isRetryableModelError(err)) throw err;
      console.warn(`[ai] model ${model} unavailable (${err.message}); trying fallback`);
    }
  }
  throw lastErr;
}

function geminiHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey,
  };
}

/**
 * Gemini 2.5/3 thinking models put reasoning in earlier parts (sometimes
 * `thought: true`) and can leave parts[0].text empty when maxOutputTokens
 * is too small. Join visible text parts only.
 */
export function extractGeminiText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .filter((part) => part && part.thought !== true && typeof part.text === 'string')
    .map((part) => part.text)
    .join('')
    .trim();
}

function missingKeyResponse() {
  return {
    statusCode: 503,
    body: {
      error: 'Gemini is not configured',
      code: 'GEMINI_API_KEY_MISSING',
      hint: 'Set GEMINI_API_KEY in Netlify environment variables',
    },
  };
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

  const scaled = cleaned.map((row) => {
    const allocation = (row.allocation / total) * budget;
    return {
      ...row,
      allocation,
      percentage: (allocation / budget) * 100,
    };
  });

  const drift = budget - scaled.reduce((sum, row) => sum + row.allocation, 0);
  if (Math.abs(drift) > 0.01 && scaled.length > 0) {
    const richest = scaled.reduce((a, b) => (a.allocation >= b.allocation ? a : b));
    richest.allocation += drift;
    richest.percentage = (richest.allocation / budget) * 100;
  }

  return scaled;
}

function clampScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, n));
}

function normalizePicks(stocks, rawPicks) {
  const bySymbol = new Map(stocks.map((s) => [s.symbol, s]));
  const seen = new Set();
  const picks = [];

  for (const row of rawPicks ?? []) {
    const symbol = String(row?.symbol ?? '').trim().toUpperCase();
    const stock = bySymbol.get(symbol) ?? bySymbol.get(String(row?.symbol ?? '').trim());
    if (!stock || seen.has(stock.symbol)) continue;
    seen.add(stock.symbol);

    const action = ['buy', 'watch', 'skip'].includes(row.action) ? row.action : 'watch';
    const confidence = ['high', 'medium', 'low'].includes(row.confidence)
      ? row.confidence
      : 'medium';
    const dropType = ['technical', 'sector-wide', 'news-based', 'correction', 'unknown'].includes(
      row.dropType
    )
      ? row.dropType
      : 'unknown';

    picks.push({
      symbol: stock.symbol,
      displayName: stock.displayName,
      score: clampScore(row.score),
      action,
      confidence,
      dropType,
      rationale: String(row.rationale || 'Gemini dip ranking').slice(0, 220),
      riskNote: String(row.riskNote || 'Model estimate only').slice(0, 160),
    });
  }

  for (const stock of stocks) {
    if (seen.has(stock.symbol)) continue;
    picks.push({
      symbol: stock.symbol,
      displayName: stock.displayName,
      score: 40,
      action: 'watch',
      confidence: 'low',
      dropType: 'unknown',
      rationale: 'Filled to cover all red candidates',
      riskNote: 'No model ranking returned for this symbol',
    });
  }

  return picks.sort((a, b) => b.score - a.score);
}

function stockLines(stocks) {
  return stocks.map((s) => {
    const change =
      typeof s.changePercent === 'number' ? `${s.changePercent.toFixed(2)}%` : 'n/a';
    const price = typeof s.price === 'number' ? s.price : 'n/a';
    const holding =
      typeof s.holdingQty === 'number' ? `${s.holdingQty} shares` : 'none';
    return `- ${s.symbol} (${s.displayName}): sector=${s.sector || 'Unknown'}, price=${price}, change=${change}, holding=${holding}`;
  });
}

function buildAllocatePrompt({ budget, stocks, currency }) {
  return [
    'You are an allocation assistant for Dip Hunter, an Indian NSE/BSE buy-the-dip planner.',
    'Indian cash session is 09:15–15:30 IST; do not assume US market hours or US ticker suffixes.',
    'Allocate the monthly budget across ONLY the listed red-candidate stocks.',
    'Prefer diversification; do not put more than 40% in one symbol unless the list is tiny.',
    'Favor deeper dips only when the drop looks like a correction rather than a single-name collapse.',
    'Return INR amounts that sum to the budget. This is decision support, not financial advice.',
    '',
    `Currency: ${currency || 'INR'}`,
    `Budget: ${budget}`,
    'Candidates:',
    ...stockLines(stocks),
  ].join('\n');
}

function buildPredictPrompt({ stocks, currency }) {
  return [
    'You are a dip-ranking assistant for Dip Hunter, an Indian NSE/BSE buy-the-dip planner.',
    'Indian cash session is 09:15–15:30 IST; do not assume US market hours or US ticker suffixes.',
    'Rank ONLY the listed red-candidate stocks by how attractive the dip looks for a staged buy.',
    'Prefer 2-8% pullbacks and sector-wide softness over single-name collapses.',
    'Score 0-100. Use action buy / watch / skip. This is decision support, not financial advice.',
    '',
    `Currency: ${currency || 'INR'}`,
    'Candidates:',
    ...stockLines(stocks),
  ].join('\n');
}

async function callGemini({ apiKey, model, prompt, schema }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const response = await fetch(url, {
    method: 'POST',
    headers: geminiHeaders(apiKey),
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      payload?.error?.message || payload?.message || `Gemini HTTP ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  const text = extractGeminiText(payload);
  if (!text) {
    throw new Error('Gemini returned an empty response');
  }

  return JSON.parse(text);
}

function validateStocks(stocks) {
  if (!Array.isArray(stocks) || stocks.length === 0) {
    return { statusCode: 400, body: { error: 'stocks must be a non-empty array' } };
  }
  if (stocks.length > 30) {
    return { statusCode: 400, body: { error: 'stocks list is too large (max 30)' } };
  }
  return null;
}

async function handleAllocate(body, env) {
  const budget = Number(body.budget);
  const stocks = Array.isArray(body.stocks) ? body.stocks : [];
  const currency = body.currency || 'INR';
  const stockError = validateStocks(stocks);
  if (stockError) return stockError;

  if (!Number.isFinite(budget) || budget <= 0) {
    return { statusCode: 400, body: { error: 'budget must be a positive number' } };
  }

  const apiKey = readApiKey(env);
  const { data: raw, model } = await withModelFallback(env, (modelId) =>
    callGemini({
      apiKey,
      model: modelId,
      prompt: buildAllocatePrompt({ budget, stocks, currency }),
      schema: ALLOCATION_SCHEMA,
    })
  );

  const allocations = normalizeAllocations(stocks, budget, raw.allocations);
  const riskProfile = ['aggressive', 'balanced', 'conservative'].includes(raw.riskProfile)
    ? raw.riskProfile
    : 'balanced';

  return {
    statusCode: 200,
    body: {
      suggestion: {
        strategy: 'gemini',
        name: 'Gemini Advisor',
        description: String(raw.description || 'Gemini allocation for this month’s red candidates'),
        rationale: String(
          raw.rationale || 'Model-weighted split across red candidates for a buy-the-dip plan.'
        ),
        allocations,
        riskProfile,
        expectedReturn: String(raw.expectedReturn || 'Model estimate only'),
        provider: 'gemini',
        model,
        disclaimer: DISCLAIMER,
      },
    },
  };
}

async function handlePredict(body, env) {
  const stocks = Array.isArray(body.stocks) ? body.stocks : [];
  const currency = body.currency || 'INR';
  const stockError = validateStocks(stocks);
  if (stockError) return stockError;

  const apiKey = readApiKey(env);
  const { data: raw, model } = await withModelFallback(env, (modelId) =>
    callGemini({
      apiKey,
      model: modelId,
      prompt: buildPredictPrompt({ stocks, currency }),
      schema: PREDICT_SCHEMA,
    })
  );

  const marketTone = ['risk-on', 'cautious', 'defensive'].includes(raw.marketTone)
    ? raw.marketTone
    : 'cautious';

  return {
    statusCode: 200,
    body: {
      prediction: {
        summary: String(raw.summary || 'Gemini ranked today’s red candidates by dip quality.'),
        marketTone,
        picks: normalizePicks(stocks, raw.picks),
        provider: 'gemini',
        model,
        disclaimer: DISCLAIMER,
      },
    },
  };
}

async function callGeminiChat({ apiKey, model, contents }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const response = await fetch(url, {
    method: 'POST',
    headers: geminiHeaders(apiKey),
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 4096,
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      payload?.error?.message || payload?.message || `Gemini HTTP ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  const text = extractGeminiText(payload);
  if (!text) {
    throw new Error('Gemini returned an empty chat response');
  }

  return String(text).trim().slice(0, 2500);
}

function handleChat(body, env) {
  const message = String(body?.message ?? '').trim();
  if (!message) {
    return Promise.resolve({ statusCode: 400, body: { error: 'message is required' } });
  }
  if (message.length > 2000) {
    return Promise.resolve({ statusCode: 400, body: { error: 'message is too long (max 2000)' } });
  }

  const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
  const context = String(body.context || '').slice(0, 3500);

  const preamble = [
    'You are Finance Buddy, a concise in-app assistant for Dip Hunter, an Indian NSE/BSE buy-the-dip planner.',
    'You have built-in NSE and BSE market knowledge. Use it for hours, settlement, indices, circuits, and Indian tickers.',
    'Do not assume NYSE/NASDAQ hours or US ticker suffixes.',
    nseBsePromptSnippet(),
    'Help with red dips, monthly plans, allocation, and portfolio health using ONLY the snapshot below for live figures.',
    'Do not invent prices. Stay under 140 words. This is decision support, not financial advice.',
    '',
    context || 'No live snapshot was provided.',
  ].join('\n');

  const contents = [
    { role: 'user', parts: [{ text: preamble }] },
    {
      role: 'model',
      parts: [
        {
          text: 'Understood. I am Finance Buddy in Dip Hunter. I will use NSE/BSE market knowledge plus the snapshot, stay concise, and note this is not financial advice.',
        },
      ],
    },
  ];

  for (const turn of history) {
    const text = String(turn?.text || '').trim().slice(0, 1500);
    if (!text) continue;
    const role = turn.role === 'assistant' || turn.role === 'model' ? 'model' : 'user';
    contents.push({ role, parts: [{ text }] });
  }
  contents.push({ role: 'user', parts: [{ text: message }] });

  return withModelFallback(env, (modelId) =>
    callGeminiChat({ apiKey: readApiKey(env), model: modelId, contents })
  ).then(({ data: reply, model }) => ({
    statusCode: 200,
    body: {
      reply,
      provider: 'gemini',
      model,
      disclaimer: DISCLAIMER,
    },
  }));
}

/**
 * @param {object} body Parsed JSON request body
 * @param {NodeJS.ProcessEnv} env Process environment
 * @returns {Promise<{statusCode: number, body: object}>}
 */
export async function handleAiRequest(body, env) {
  const action = body?.action || 'allocate';
  if (action === 'status') {
    return {
      statusCode: 200,
      body: {
        configured: Boolean(readApiKey(env)),
        model: String(env?.GEMINI_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL,
      },
    };
  }

  if (!readApiKey(env)) {
    return missingKeyResponse();
  }
  try {
    if (action === 'allocate') {
      return await handleAllocate(body, env);
    }
    if (action === 'predict') {
      return await handlePredict(body, env);
    }
    if (action === 'chat') {
      return await handleChat(body, env);
    }
    return { statusCode: 400, body: { error: `Unsupported action: ${action}` } };
  } catch (err) {
    console.error(`[ai] Gemini ${action} failed:`, err.message);
    const status = err.status >= 400 && err.status < 600 ? err.status : 502;
    const code =
      action === 'predict'
        ? 'GEMINI_PREDICT_FAILED'
        : action === 'chat'
          ? 'GEMINI_CHAT_FAILED'
          : 'GEMINI_ALLOCATE_FAILED';
    return {
      statusCode: status,
      body: {
        error: err.message || `Gemini ${action} failed`,
        code,
      },
    };
  }
}
