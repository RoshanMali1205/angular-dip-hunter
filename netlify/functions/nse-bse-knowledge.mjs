/**
 * NSE/BSE prompt pack for Gemini (Finance Buddy chat).
 * Keep this JSON identical to src/assets/knowledge/nse-bse.json.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pack = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'nse-bse-knowledge.json'), 'utf8')
);

export function nseBsePromptSnippet() {
  return String(pack.prompt || '').trim();
}
