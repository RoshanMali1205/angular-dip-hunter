/**
 * Login-day card of Gemini investment ideas.
 * Closing it dismisses the card until the next IST day.
 */

import { Component, HostListener, effect, inject, input, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DailyIdeasService } from '../../../core/services/daily-ideas.service';
import { LanguageService } from '../../../core/services/language.service';
import { ThemeService } from '../../../core/services/theme.service';
import { InvestmentIdea } from '../../../core/models/plan.model';

@Component({
  selector: 'app-daily-ideas-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (!paused() && ideas.visible()) {
      <div class="fixed inset-0 z-[9990] flex items-end sm:items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" (click)="close()"></div>

        <section class="relative w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden"
                 [class.bg-slate-900]="isDark()"
                 [class.border-emerald-500/30]="isDark()"
                 [class.bg-white]="!isDark()"
                 [class.border-emerald-200]="!isDark()"
                 (click)="$event.stopPropagation()"
                 role="dialog"
                 aria-modal="true"
                 [attr.aria-label]="lang.t('dailyIdeas.title')">
          <div class="h-1 w-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-violet-500"></div>

          <div class="px-5 pt-5 pb-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-[11px] font-semibold uppercase tracking-wider"
                   [class.text-emerald-400]="isDark()"
                   [class.text-emerald-600]="!isDark()">
                  {{ ideas.brief()?.provider === 'gemini' ? lang.t('dailyIdeas.gemini') : lang.t('dailyIdeas.offline') }}
                </p>
                <h2 class="mt-1 text-lg font-bold leading-snug"
                    [class.text-white]="isDark()"
                    [class.text-gray-900]="!isDark()">{{ lang.t('dailyIdeas.title') }}</h2>
                <p class="mt-1 text-xs leading-relaxed"
                   [class.text-slate-400]="isDark()"
                   [class.text-gray-500]="!isDark()">{{ lang.t('dailyIdeas.subtitle') }}</p>
              </div>
              <button type="button"
                      (click)="close()"
                      class="shrink-0 rounded-lg p-1.5 transition"
                      [class.text-slate-300]="isDark()"
                      [class.hover:bg-slate-800]="isDark()"
                      [class.text-gray-500]="!isDark()"
                      [class.hover:bg-gray-100]="!isDark()"
                      [attr.aria-label]="lang.t('dailyIdeas.close')">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            @if (ideas.loading()) {
              <p class="mt-4 text-sm"
                 [class.text-slate-300]="isDark()"
                 [class.text-gray-600]="!isDark()">{{ lang.t('dailyIdeas.loading') }}</p>
              <div class="mt-3 space-y-2">
                @for (slot of [1, 2, 3]; track slot) {
                  <div class="h-16 rounded-xl animate-pulse"
                       [class.bg-slate-800]="isDark()"
                       [class.bg-gray-100]="!isDark()"></div>
                }
              </div>
            } @else if (ideas.brief(); as brief) {
              <p class="mt-4 text-sm leading-relaxed"
                 [class.text-slate-200]="isDark()"
                 [class.text-gray-700]="!isDark()">{{ brief.headline }}</p>

              <div class="mt-3 space-y-2.5">
                @for (idea of brief.ideas; track idea.symbol) {
                  <article class="rounded-xl border p-3"
                           [class.border-slate-700]="isDark()"
                           [class.bg-slate-800/70]="isDark()"
                           [class.border-gray-200]="!isDark()"
                           [class.bg-gray-50]="!isDark()">
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <p class="text-sm font-semibold truncate"
                           [class.text-white]="isDark()"
                           [class.text-gray-900]="!isDark()">{{ idea.symbol }}</p>
                        <p class="text-[11px] truncate"
                           [class.text-slate-400]="isDark()"
                           [class.text-gray-500]="!isDark()">{{ idea.displayName }}</p>
                      </div>
                      <span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                            [class]="convictionClass(idea)">
                        {{ lang.t('dailyIdeas.convictions.' + idea.conviction) }}
                      </span>
                    </div>
                    <p class="mt-2 text-xs leading-relaxed"
                       [class.text-slate-300]="isDark()"
                       [class.text-gray-700]="!isDark()">{{ idea.thesis }}</p>
                    <p class="mt-1.5 text-[11px]"
                       [class.text-slate-400]="isDark()"
                       [class.text-gray-500]="!isDark()">
                      {{ lang.t('dailyIdeas.horizons.' + idea.horizon) }}
                      · {{ lang.t('dailyIdeas.risk') }}: {{ idea.riskNote }}
                    </p>
                  </article>
                }
              </div>

              <p class="mt-3 text-[11px] leading-relaxed"
                 [class.text-slate-500]="isDark()"
                 [class.text-gray-400]="!isDark()">{{ brief.disclaimer }}</p>
            }

            <button type="button"
                    (click)="close()"
                    class="mt-4 w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400">
              {{ lang.t('dailyIdeas.gotIt') }}
            </button>
          </div>
        </section>
      </div>
    }
  `
})
export class DailyIdeasCardComponent {
  readonly ideas = inject(DailyIdeasService);
  readonly lang = inject(LanguageService);
  /** Hide while the tour or What's New modal is in front. */
  readonly paused = input(false);

  private readonly theme = inject(ThemeService);
  readonly isDark = this.theme.isDark;

  constructor() {
    effect(() => {
      if (this.paused()) return;
      untracked(() => this.ideas.presentToday());
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.paused() || !this.ideas.visible()) return;
    this.close();
  }

  close(): void {
    this.ideas.dismiss();
  }

  convictionClass(idea: InvestmentIdea): string {
    const dark = this.isDark();
    if (idea.conviction === 'high') {
      return dark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700';
    }
    if (idea.conviction === 'low') {
      return dark ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-600';
    }
    return dark ? 'bg-cyan-500/15 text-cyan-300' : 'bg-cyan-50 text-cyan-700';
  }
}
