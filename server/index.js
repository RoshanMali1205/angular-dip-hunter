/**
 * Yahoo Finance Proxy Server with Caching
 * Author: Roshan Mali
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Batch quotes endpoint
app.get('/api/quotes', async (req, res) => {
  const { symbols } = req.query;
  
  if (!symbols) {
    return res.status(400).json({ error: 'symbols required' });
  }

  const symbolList = symbols.split(',').map(s => s.trim());
  console.log(`[${new Date().toLocaleTimeString()}] Fetching ${symbolList.length} symbols`);

  const results = {};

  await Promise.all(symbolList.map(async (symbol) => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      if (response.ok) {
        const data = await response.json();
        const meta = data.chart?.result?.[0]?.meta;
        if (meta) {
          results[symbol.replace('.NS', '')] = {
            symbol: symbol.replace('.NS', ''),
            price: meta.regularMarketPrice,
            previousClose: meta.previousClose,
            change: +(meta.regularMarketPrice - meta.previousClose).toFixed(2),
            changePercent: +(((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100).toFixed(2),
            dayHigh: meta.regularMarketDayHigh,
            dayLow: meta.regularMarketDayLow,
            volume: meta.regularMarketVolume,
            currency: meta.currency || 'INR',
            timestamp: new Date().toISOString(),
            source: 'yahoo'
          };
        }
      }
    } catch (err) {
      console.error(`Error fetching ${symbol}:`, err.message);
    }
  }));

  res.json({ quotes: results, timestamp: new Date().toISOString() });
});

// Single chart endpoint  
app.get('/api/chart/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const { interval = '15m', range = '1d' } = req.query;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Gemini allocation proxy (mirrors netlify/functions/ai.mjs for local dev).
 * Requires GEMINI_API_KEY in the shell environment.
 */
app.post('/api/ai', express.json(), async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'Gemini is not configured',
      code: 'GEMINI_API_KEY_MISSING',
      hint: 'export GEMINI_API_KEY=... before starting the proxy',
    });
  }

  const action = req.body?.action || 'allocate';
  if (action !== 'allocate') {
    return res.status(400).json({ error: `Unsupported action: ${action}` });
  }

  const budget = Number(req.body?.budget);
  const stocks = Array.isArray(req.body?.stocks) ? req.body.stocks : [];
  const currency = req.body?.currency || 'INR';
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  if (!Number.isFinite(budget) || budget <= 0) {
    return res.status(400).json({ error: 'budget must be a positive number' });
  }
  if (stocks.length === 0) {
    return res.status(400).json({ error: 'stocks must be a non-empty array' });
  }

  const prompt = [
    'You are an allocation assistant for Dip Hunter, an Indian NSE buy-the-dip planner.',
    'Allocate the monthly budget across ONLY the listed red-candidate stocks.',
    'Prefer diversification; do not put more than 40% in one symbol unless the list is tiny.',
    'Return INR amounts that sum to the budget. This is decision support, not financial advice.',
    '',
    `Currency: ${currency}`,
    `Budget: ${budget}`,
    'Candidates:',
    ...stocks.map((s) => {
      const change =
        typeof s.changePercent === 'number' ? `${s.changePercent.toFixed(2)}%` : 'n/a';
      return `- ${s.symbol} (${s.displayName}): sector=${s.sector || 'Unknown'}, price=${s.price ?? 'n/a'}, change=${change}`;
    }),
  ].join('\n');

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              description: { type: 'STRING' },
              rationale: { type: 'STRING' },
              riskProfile: {
                type: 'STRING',
                format: 'enum',
                enum: ['aggressive', 'balanced', 'conservative'],
              },
              expectedReturn: { type: 'STRING' },
              allocations: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    symbol: { type: 'STRING' },
                    allocation: { type: 'NUMBER' },
                    reason: { type: 'STRING' },
                  },
                  required: ['symbol', 'allocation', 'reason'],
                },
              },
            },
            required: ['description', 'rationale', 'riskProfile', 'expectedReturn', 'allocations'],
          },
        },
      }),
    });

    const payload = await geminiRes.json();
    if (!geminiRes.ok) {
      return res.status(geminiRes.status).json({
        error: payload?.error?.message || `Gemini HTTP ${geminiRes.status}`,
        code: 'GEMINI_ALLOCATE_FAILED',
      });
    }

    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return res.status(502).json({ error: 'Gemini returned an empty allocation response' });
    }

    const raw = JSON.parse(text);
    const bySymbol = new Map(stocks.map((s) => [s.symbol, s]));
    let cleaned = (raw.allocations || [])
      .map((row) => {
        const stock = bySymbol.get(String(row.symbol || '').trim());
        const amount = Number(row.allocation);
        if (!stock || !Number.isFinite(amount) || amount < 0) return null;
        return {
          symbol: stock.symbol,
          displayName: stock.displayName,
          allocation: amount,
          reason: String(row.reason || 'Gemini suggestion').slice(0, 160),
        };
      })
      .filter(Boolean);

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
      cleaned = stocks.map((stock) => ({
        symbol: stock.symbol,
        displayName: stock.displayName,
        allocation: equal,
        reason: 'Equal fallback — Gemini returned empty weights',
      }));
    }

    const scaleTotal = cleaned.reduce((sum, row) => sum + row.allocation, 0) || 1;
    const allocations = cleaned.map((row) => {
      const allocation = (row.allocation / scaleTotal) * budget;
      return {
        ...row,
        allocation,
        percentage: (allocation / budget) * 100,
      };
    });

    res.json({
      suggestion: {
        strategy: 'gemini',
        name: 'Gemini Advisor',
        description: String(raw.description || 'Gemini allocation for this month’s red candidates'),
        rationale: String(raw.rationale || 'Model-weighted split across red candidates.'),
        allocations,
        riskProfile: ['aggressive', 'balanced', 'conservative'].includes(raw.riskProfile)
          ? raw.riskProfile
          : 'balanced',
        expectedReturn: String(raw.expectedReturn || 'Model estimate only'),
        provider: 'gemini',
        model,
        disclaimer: 'AI-assisted suggestion — not financial advice.',
      },
    });
  } catch (err) {
    console.error('[ai] Error:', err.message);
    res.status(502).json({ error: err.message, code: 'GEMINI_ALLOCATE_FAILED' });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Proxy running at http://localhost:${PORT}`);
  console.log(`   GET /api/quotes?symbols=RELIANCE.NS,TCS.NS`);
  console.log(`   GET /api/chart/:symbol`);
  console.log(`   POST /api/ai  (requires GEMINI_API_KEY)\n`);
});
