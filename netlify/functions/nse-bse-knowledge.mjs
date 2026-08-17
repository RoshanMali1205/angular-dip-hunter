/**
 * NSE/BSE prompt pack for Gemini (Finance Buddy chat).
 * Keep this JSON identical to src/assets/knowledge/nse-bse.json.
 * Use createRequire so Netlify's bundler inlines the JSON (readFileSync is dropped).
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pack = require('./nse-bse-knowledge.json');

export function nseBsePromptSnippet() {
  return String(pack?.prompt || '').trim();
}
