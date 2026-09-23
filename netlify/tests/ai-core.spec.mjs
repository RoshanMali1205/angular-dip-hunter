import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractGeminiText, handleAiRequest, buildPredictPrompt, buildIdeasPrompt } from '../functions/ai-core.mjs';
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

  it('asks Gemini for three ideas drawn only from the watchlist', () => {
    const prompt = buildIdeasPrompt({
      stocks: [{ symbol: 'INFY', displayName: 'Infosys', changePercent: -2.4 }],
      currency: 'INR',
    });
    assert.match(prompt, /exactly 3 investment ideas/);
    assert.match(prompt, /ONLY the listed watched stocks/);
    assert.match(prompt, /INFY/);
  });

  it('returns missing-key for ideas instead of crashing', async () => {
    const result = await handleAiRequest({ action: 'ideas', stocks: [{ symbol: 'TCS' }] }, {});
    assert.equal(result.statusCode, 503);
    assert.equal(result.body.code, 'GEMINI_API_KEY_MISSING');
  });

  it('rejects an empty ideas watchlist before calling Gemini', async () => {
    const result = await handleAiRequest({ action: 'ideas', stocks: [] }, { GEMINI_API_KEY: 'test-key' });
    assert.equal(result.statusCode, 400);
  });

  it('keeps only watched symbols from a Gemini ideas payload', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    headline: 'Two names, one stranger',
                    ideas: [
                      {
                        symbol: 'TCS',
                        horizon: 'medium',
                        conviction: 'high',
                        thesis: 'Core IT compounder on a dip.',
                        riskNote: 'Valuation can stay rich.',
                      },
                      {
                        symbol: 'NOTREAL',
                        horizon: 'short',
                        conviction: 'low',
                        thesis: 'Ignore',
                        riskNote: 'Unknown',
                      },
                      {
                        symbol: 'INFY',
                        horizon: 'short',
                        conviction: 'medium',
                        thesis: 'Second idea.',
                        riskNote: 'Soft demand.',
                      },
                      {
                        symbol: 'RELIANCE',
                        horizon: 'long',
                        conviction: 'low',
                        thesis: 'Third idea.',
                        riskNote: 'Oil cycle.',
                      },
                      {
                        symbol: 'ITC',
                        horizon: 'long',
                        conviction: 'medium',
                        thesis: 'Fourth should be dropped.',
                        riskNote: 'Extra.',
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      }),
    });

    try {
      const result = await handleAiRequest(
        {
          action: 'ideas',
          stocks: [
            { symbol: 'TCS', displayName: 'TCS' },
            { symbol: 'INFY', displayName: 'Infosys' },
            { symbol: 'RELIANCE', displayName: 'Reliance' },
            { symbol: 'ITC', displayName: 'ITC' },
          ],
        },
        { GEMINI_API_KEY: 'test-key' }
      );
      assert.equal(result.statusCode, 200);
      assert.equal(result.body.ideas.provider, 'gemini');
      assert.deepEqual(
        result.body.ideas.ideas.map((idea) => idea.symbol),
        ['TCS', 'INFY', 'RELIANCE']
      );
      assert.equal(result.body.ideas.ideas[0].displayName, 'TCS');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
