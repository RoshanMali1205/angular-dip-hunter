import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractGeminiText, handleAiRequest, buildPredictPrompt } from '../functions/ai-core.mjs';
import { nseBsePromptSnippet } from '../functions/nse-bse-knowledge.mjs';

describe('Netlify AI function modules', () => {
  it('loads the NSE/BSE prompt without createRequire', () => {
    assert.match(nseBsePromptSnippet(), /09:15/);
  });

  it('reports Gemini status without throwing', async () => {
    const result = await handleAiRequest({ action: 'status' }, {});
    assert.equal(result.statusCode, 200);
    assert.equal(result.body.configured, false);
  });

  it('returns missing-key for chat instead of crashing', async () => {
    const result = await handleAiRequest({ action: 'chat', message: 'hi' }, {});
    assert.equal(result.statusCode, 503);
    assert.equal(result.body.code, 'GEMINI_API_KEY_MISSING');
  });

  it('joins visible Gemini parts and skips thought tokens', () => {
    const text = extractGeminiText({
      candidates: [
        {
          content: {
            parts: [
              { thought: true, text: 'internal reasoning' },
              { text: 'NSE opens at ' },
              { text: '09:15 IST.' },
            ],
          },
        },
      ],
    });
    assert.equal(text, 'NSE opens at 09:15 IST.');
  });

  it('asks Gemini to rank all watched names, not only reds', () => {
    const prompt = buildPredictPrompt({
      stocks: [{ symbol: 'RELIANCE', displayName: 'Reliance', changePercent: 0.65 }],
      currency: 'INR',
    });
    assert.match(prompt, /Rank ALL listed watched stocks/);
    assert.match(prompt, /RELIANCE/);
  });
});
