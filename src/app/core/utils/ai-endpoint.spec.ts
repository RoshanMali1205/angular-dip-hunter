import { resolveAiEndpoint } from './ai-endpoint';

describe('resolveAiEndpoint', () => {
  const originalLocation = globalThis.location;

  afterEach(() => {
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('uses the Netlify function path on same origin', () => {
    expect(resolveAiEndpoint('')).toBe('/.netlify/functions/ai');
    expect(resolveAiEndpoint(undefined)).toBe('/.netlify/functions/ai');
  });

  it('prefixes a configured proxy base URL on localhost', () => {
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: { hostname: 'localhost' },
    });
    expect(resolveAiEndpoint('http://localhost:3001')).toBe('http://localhost:3001/api/ai');
  });

  it('does not send production chat through a quotes-only proxy', () => {
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: { hostname: 'dip-hunter.netlify.app' },
    });
    expect(resolveAiEndpoint('https://quotes.example.com')).toBe('/.netlify/functions/ai');
  });
});
