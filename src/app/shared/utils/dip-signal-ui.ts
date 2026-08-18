import { DipAction } from '../../core/models/plan.model';

/** Solid pills matching the dashboard AI Signal column. */
export function dipActionPillClasses(action: DipAction, dark: boolean): string {
  if (action === 'buy') {
    return dark ? 'bg-emerald-600 text-white' : 'bg-emerald-600 text-white';
  }
  if (action === 'watch') {
    return dark ? 'bg-amber-500 text-white' : 'bg-amber-500 text-white';
  }
  return dark ? 'bg-red-800 text-white' : 'bg-red-700 text-white';
}

/** Score text color tracks the matching AI signal. */
export function dipScoreTextClasses(action: DipAction, dark: boolean): string {
  if (action === 'buy') {
    return dark ? 'text-emerald-400' : 'text-emerald-600';
  }
  if (action === 'watch') {
    return dark ? 'text-amber-400' : 'text-amber-600';
  }
  return dark ? 'text-red-400' : 'text-red-600';
}
