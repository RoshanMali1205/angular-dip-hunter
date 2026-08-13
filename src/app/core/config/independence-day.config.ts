/**
 * Independence Day (15 Aug) end-of-day in India Standard Time.
 * Used to gate Tiranga app-icon branding.
 */
export const INDEPENDENCE_DAY_EOD_IST = new Date('2026-08-15T23:59:59.999+05:30');

export function isIndependenceDayIconActive(now: Date = new Date()): boolean {
  return now.getTime() <= INDEPENDENCE_DAY_EOD_IST.getTime();
}
