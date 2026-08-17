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
 * Gemini AI proxy (mirrors netlify/functions/ai.mjs for local dev).
 * Requires GEMINI_API_KEY in the shell environment.
 */
app.post('/api/ai', express.json(), async (req, res) => {
  try {
    const { handleAiRequest } = await import('../netlify/functions/ai-core.mjs');
    const result = await handleAiRequest(req.body ?? {}, process.env);
    if (result.body?.code === 'GEMINI_API_KEY_MISSING') {
      result.body.hint = 'export GEMINI_API_KEY=... before starting the proxy';
    }
    res.status(result.statusCode).json(result.body);
  } catch (err) {
    console.error('[ai] Error:', err.message);
    res.status(502).json({ error: err.message, code: 'GEMINI_REQUEST_FAILED' });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Proxy running at http://localhost:${PORT}`);
  console.log(`   GET /api/quotes?symbols=RELIANCE.NS,TCS.NS`);
  console.log(`   GET /api/chart/:symbol`);
  console.log(`   POST /api/ai  (allocate | predict | chat, requires GEMINI_API_KEY)\n`);
});
