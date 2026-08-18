/**
 * NSE/BSE prompt pack for Gemini (Finance Buddy chat).
 * Keep this JSON identical to src/assets/knowledge/nse-bse.json.
 *
 * Do not use createRequire(import.meta.url). Netlify's function bundler
 * strips import.meta.url, which 502s the entire `ai` function before
 * GEMINI_API_KEY is read.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Same text as nse-bse-knowledge.json "prompt" — used if the JSON file is not on disk. */
const FALLBACK_PROMPT =
  'Indian cash equities on NSE and BSE — not US markets. Do not assume NYSE/NASDAQ hours or US ticker suffixes.\n' +
  'Hours (IST, Mon–Fri except exchange holidays): pre-open ~09:00–09:15 (order entry ~09:00–09:08, matching ~09:08–09:12, buffer ~09:12–09:15); continuous cash 09:15–15:30; closing session ~15:40–16:00. No regular Saturday/Sunday cash trading. Muhurat is a special Diwali session when announced.\n' +
  'NSE = National Stock Exchange (benchmark Nifty 50). BSE = Bombay Stock Exchange (benchmark Sensex 30). Many names trade on both; Dip Hunter’s default universe is NSE cash symbols stored without a suffix (RELIANCE, TCS).\n' +
  'Quote suffixes: Yahoo/NSE = SYMBOL.NS, Yahoo/BSE = SYMBOL.BO.\n' +
  'Settlement: standard cash equity is T+1; optional T+0 exists for eligible names — do not invent which names qualify. Confirm holidays on the exchange calendar.\n' +
  'Circuits: stock price bands are commonly 2/5/10/20%; index-wide halts have historically used 10/15/20% of the previous close. A frozen lower-circuit name is not an ordinary staged dip.\n' +
  'F&O is a separate segment (lots, expiry, margins). Dip Hunter monthly plans are cash/delivery-style buys, not F&O lots.\n' +
  'Dip Hunter Growth 20: RELIANCE, HDFCBANK, ICICIBANK, TCS, INFY, BHARTIARTL, HAL, LT, ADANIPORTS, ITC, BAJFINANCE, SUNPHARMA, TITAN, NTPC, ULTRACEMCO, ASIANPAINT, MARUTI, M&M, PERSISTENT, AFFLE.\n' +
  'Dip Hunter Dividend 10: VEDL, COALINDIA, CASTROLIND, ONGC, POWERGRID, RECLTD, PFC, NTPC, ITC, WIPRO. ITC and NTPC appear in both folders.\n' +
  'Dip context: prefer orderly ~2–8% pullbacks and sector softness over single-name news crashes or circuit-frozen names. Currency is INR. Never invent live prices. Do not quote stale tax rates (STT/LTCG/STCG). This is decision support, not financial advice.';

function jsonCandidates() {
  const files = [
    join(process.cwd(), 'nse-bse-knowledge.json'),
    join(process.cwd(), 'netlify/functions/nse-bse-knowledge.json'),
  ];
  const metaUrl = import.meta?.url;
  if (typeof metaUrl === 'string' && metaUrl.includes('://')) {
    try {
      files.unshift(join(dirname(fileURLToPath(metaUrl)), 'nse-bse-knowledge.json'));
    } catch {
      // Bundled functions may have a non-file import.meta.url.
    }
  }
  return files;
}

function loadPrompt() {
  for (const file of jsonCandidates()) {
    try {
      const prompt = String(JSON.parse(readFileSync(file, 'utf8'))?.prompt || '').trim();
      if (prompt) return prompt;
    } catch {
      // Try the next location; never throw during module init.
    }
  }
  return FALLBACK_PROMPT;
}

const PROMPT = loadPrompt();

export function nseBsePromptSnippet() {
  return PROMPT;
}
