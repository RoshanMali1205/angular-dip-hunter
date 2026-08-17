import {
  formatNseBseReply,
  matchNseBseFact,
  NSE_BSE_KNOWLEDGE,
  nseBsePromptSnippet,
} from './nse-bse-knowledge';

describe('nse-bse-knowledge', () => {
  it('exposes a compact Gemini prompt with Indian cash-session rules', () => {
    const prompt = nseBsePromptSnippet();
    expect(prompt).toContain('09:15–15:30');
    expect(prompt).toContain('SYMBOL.NS');
    expect(prompt).toContain('T+1');
    expect(prompt).not.toContain('NYSE');
  });

  it('matches NSE cash hours before treating the question as a dip list', () => {
    const topic = matchNseBseFact('When does NSE open?');
    expect(topic?.id).toBe('hours');
    expect(formatNseBseReply(topic!)).toContain('09:15');
    expect(formatNseBseReply(topic!)).toContain(NSE_BSE_KNOWLEDGE.disclaimer);
  });

  it('matches NSE vs BSE and ticker suffixes', () => {
    expect(matchNseBseFact('What is the difference between NSE and BSE?')?.id).toBe('nse-vs-bse');
    expect(matchNseBseFact('Do I need a .NS suffix on Yahoo?')?.id).toBe('symbols');
  });

  it('does not steal red-dip or portfolio questions', () => {
    expect(matchNseBseFact('Which dips look good?')).toBeNull();
    expect(matchNseBseFact('How is my portfolio?')).toBeNull();
    expect(matchNseBseFact('How is my monthly plan?')).toBeNull();
  });
});
