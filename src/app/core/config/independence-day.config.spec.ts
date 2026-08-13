import {
  INDEPENDENCE_DAY_EOD_IST,
  isIndependenceDayIconActive,
} from './independence-day.config';

describe('independence-day.config', () => {
  it('is active before EOD IST on 15 Aug', () => {
    expect(isIndependenceDayIconActive(new Date('2026-08-15T18:00:00+05:30'))).toBe(true);
  });

  it('is inactive after EOD IST on 15 Aug', () => {
    expect(isIndependenceDayIconActive(new Date(INDEPENDENCE_DAY_EOD_IST.getTime() + 1))).toBe(false);
  });
});
