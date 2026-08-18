import { dipActionDotClasses, dipActionPillClasses, dipScoreTextClasses } from './dip-signal-ui';

describe('dip-signal-ui', () => {
  it('uses translucent chips like Status, with yellow SKIP', () => {
    expect(dipActionPillClasses('buy', true)).toContain('bg-emerald-500/15');
    expect(dipActionPillClasses('watch', false)).toContain('bg-amber-500/15');
    expect(dipActionPillClasses('skip', true)).toContain('bg-yellow-500/15');
    expect(dipActionPillClasses('skip', true)).toContain('text-yellow-400');
    expect(dipActionPillClasses('skip', true)).not.toContain('bg-red');
  });

  it('colors the score to match the signal', () => {
    expect(dipScoreTextClasses('buy', true)).toContain('text-emerald-400');
    expect(dipScoreTextClasses('watch', true)).toContain('text-amber-400');
    expect(dipScoreTextClasses('skip', true)).toContain('text-yellow-400');
    expect(dipScoreTextClasses('skip', false)).toContain('text-yellow-600');
  });

  it('uses a matching status-style dot', () => {
    expect(dipActionDotClasses('buy')).toContain('bg-emerald-400');
    expect(dipActionDotClasses('skip')).toContain('bg-yellow-400');
  });
});
