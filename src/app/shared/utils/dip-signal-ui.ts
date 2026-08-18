import { DipAction } from '../../core/models/plan.model';

/** Translucent chips matching the dashboard Status column. SKIP uses yellow, not red. */
export function dipActionPillClasses(action: DipAction, _dark = true): string {
  const base =
    'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide';
  if (action === 'buy') {
    return `${base} bg-emerald-500/15 border-emerald-500/20 text-emerald-400`;
  }
  if (action === 'watch') {
    return `${base} bg-amber-500/15 border-amber-500/20 text-amber-400`;
  }
  return `${base} bg-yellow-500/15 border-yellow-500/20 text-yellow-400`;
}

export function dipActionDotClasses(action: DipAction): string {
  if (action === 'buy') {
    return 'h-1.5 w-1.5 rounded-full bg-emerald-400';
  }
  if (action === 'watch') {
    return 'h-1.5 w-1.5 rounded-full bg-amber-400';
  }
  return 'h-1.5 w-1.5 rounded-full bg-yellow-400';
}

/** Score text color tracks the matching AI signal. */
export function dipScoreTextClasses(action: DipAction, dark: boolean): string {
  if (action === 'buy') {
    return dark ? 'text-emerald-400' : 'text-emerald-600';
  }
  if (action === 'watch') {
    return dark ? 'text-amber-400' : 'text-amber-600';
  }
  return dark ? 'text-yellow-400' : 'text-yellow-600';
}
