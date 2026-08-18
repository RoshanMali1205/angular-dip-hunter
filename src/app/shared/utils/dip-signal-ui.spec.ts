import { dipActionPillClasses, dipScoreTextClasses } from './dip-signal-ui';

describe('dip-signal-ui', () => {
  it('uses a green pill for BUY and a red pill for SKIP', () => {
    expect(dipActionPillClasses('buy', true)).toContain('bg-emerald-600');
    expect(dipActionPillClasses('skip', true)).toContain('bg-red-800');
    expect(dipActionPillClasses('watch', false)).toContain('bg-amber-500');
  });

  it('colors the score to match the signal', () => {
    expect(dipScoreTextClasses('buy', true)).toContain('text-emerald-400');
    expect(dipScoreTextClasses('watch', true)).toContain('text-amber-400');
    expect(dipScoreTextClasses('skip', false)).toContain('text-red-600');
  });
});
