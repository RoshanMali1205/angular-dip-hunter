import { resolveAiEndpoint } from './ai-endpoint';

describe('resolveAiEndpoint', () => {
  it('uses the Netlify function path on same origin', () => {
    expect(resolveAiEndpoint('')).toBe('/.netlify/functions/ai');
    expect(resolveAiEndpoint(undefined)).toBe('/.netlify/functions/ai');
  });

  it('prefixes a configured proxy base URL', () => {
    expect(resolveAiEndpoint('http://localhost:3001')).toBe('http://localhost:3001/api/ai');
  });
});
