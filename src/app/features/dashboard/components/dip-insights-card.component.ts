/**
 * Dip Insights Card
 * Ranked buy-the-dip picks from Gemini, with local heuristic fallback.
 */

import { Component, input, output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, LanguageService } from '../../../core/services';
import { DipAction, DipPick, DipPrediction } from '../../../core/models/plan.model';
import { StockViewModel } from '../../../core/models';
import { dipActionPillClasses, dipScoreTextClasses } from '../../../shared/utils/dip-signal-ui';

@Component({
  selector: 'app-dip-insights-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-xl border overflow-hidden"
         [class.border-slate-700/50]="isDark()"
         [class.bg-slate-900]="isDark()"
         [class.border-gray-200]="!isDark()"
         [class.bg-white]="!isDark()">

      <div class="px-4 py-3 border-b flex items-center justify-between gap-2"
           [class.border-slate-700/50]="isDark()"
           [class.bg-slate-800/60]="isDark()"
           [class.border-gray-100]="!isDark()"
           [class.bg-gray-50]="!isDark()">
        <div class="min-w-0">
          <h3 class="text-sm font-semibold flex items-center gap-1.5"
              [class.text-white]="isDark()"
              [class.text-gray-900]="!isDark()">
            <span>✨</span>
            <span>{{ lang.t('dashboard.dipTitle') }}</span>
          </h3>
          <p class="text-xs mt-0.5"
             [class.text-slate-400]="isDark()"
             [class.text-gray-500]="!isDark()">
            {{ subtitle() }}
          </p>
        </div>
        <span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
              [class.bg-violet-500/15]="isDark() && provider() === 'gemini'"
              [class.text-violet-300]="isDark() && provider() === 'gemini'"
              [class.bg-violet-50]="!isDark() && provider() === 'gemini'"
              [class.text-violet-700]="!isDark() && provider() === 'gemini'"
              [class.bg-slate-700/60]="isDark() && provider() !== 'gemini'"
              [class.text-slate-300]="isDark() && provider() !== 'gemini'"
              [class.bg-gray-100]="!isDark() && provider() !== 'gemini'"
              [class.text-gray-600]="!isDark() && provider() !== 'gemini'">
          @if (loading()) {
            {{ lang.t('dashboard.dipAskingGemini') }}
          } @else if (provider() === 'gemini') {
            {{ lang.t('dashboard.dipGemini') }}
          } @else {
            {{ lang.t('dashboard.dipLocal') }}
          }
        </span>
      </div>

      <div class="p-4">
        @if (picks().length === 0) {
          <div class="text-center py-4">
            <p class="text-sm"
               [class.text-slate-400]="isDark()"
               [class.text-gray-500]="!isDark()">{{ lang.t('dashboard.dipEmpty') }}</p>
          </div>
        } @else {
          @if (prediction()?.summary; as summary) {
            <p class="text-xs mb-3"
               [class.text-slate-300]="isDark()"
               [class.text-gray-600]="!isDark()">{{ summary }}</p>
          }

          <div class="space-y-2">
            @for (pick of topPicks(); track pick.symbol) {
              <div class="rounded-lg border p-2.5"
                   [class.border-slate-700/40]="isDark()"
                   [class.bg-slate-800/40]="isDark()"
                   [class.border-gray-100]="!isDark()"
                   [class.bg-gray-50]="!isDark()">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <p class="text-sm font-semibold"
                         [class.text-white]="isDark()"
                         [class.text-gray-900]="!isDark()">{{ pick.symbol }}</p>
                      <span class="rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                            [class]="actionClasses(pick.action)">
                        {{ actionLabel(pick.action) }}
                      </span>
                    </div>
                    <p class="text-xs mt-1 line-clamp-2"
                       [class.text-slate-400]="isDark()"
                       [class.text-gray-500]="!isDark()">{{ pick.rationale }}</p>
                  </div>
                  <div class="text-right shrink-0">
                    <p class="text-sm font-bold" [class]="scoreClasses(pick.action)">{{ pick.score | number:'1.0-0' }}</p>
                    <p class="text-[10px] uppercase tracking-wide"
                       [class.text-slate-500]="isDark()"
                       [class.text-gray-400]="!isDark()">{{ lang.t('dashboard.dipScore') }}</p>
                  </div>
                </div>
                @if (stockFor(pick); as vm) {
                  @if (!vm.isInCurrentPlan && pick.action !== 'skip') {
                    <button
                      type="button"
                      (click)="onAddToPlan.emit(vm)"
                      class="mt-2 inline-flex items-center gap-1 rounded-md bg-emerald-600/20 border border-emerald-500/30 px-2 py-0.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-600/30 transition">
                      {{ lang.t('dashboard.addToPlan') }}
                    </button>
                  }
                }
              </div>
            }
          </div>

          @if (prediction()?.disclaimer; as disclaimer) {
            <p class="text-[10px] mt-3 italic"
               [class.text-slate-500]="isDark()"
               [class.text-gray-400]="!isDark()">{{ disclaimer }}</p>
          }
        }
      </div>
    </div>
  `
})
export class DipInsightsCardComponent {
  stocks = input.required<StockViewModel[]>();
  prediction = input<DipPrediction | null>(null);
  loading = input(false);

  onAddToPlan = output<StockViewModel>();

  isDark = inject(ThemeService).isDark;
  lang = inject(LanguageService);

  picks = computed(() => this.prediction()?.picks ?? []);
  topPicks = computed(() => {
    const allowed = new Set(this.stocks().map((s) => s.symbol));
    return this.picks().filter((p) => allowed.has(p.symbol)).slice(0, 4);
  });
  provider = computed(() => this.prediction()?.provider ?? 'local');

  subtitle = computed(() => {
    const n = this.stocks().length;
    if (n === 0) return this.lang.t('dashboard.dipEmpty');
    const tone = this.toneLabel();
    return tone
      ? `${n} ${this.lang.t('common.stocks')} · ${tone}`
      : `${n} ${this.lang.t('common.stocks')}`;
  });

  private toneLabel(): string {
    const tone = this.prediction()?.marketTone;
    if (tone === 'risk-on') return this.lang.t('dashboard.dipToneRiskOn');
    if (tone === 'cautious') return this.lang.t('dashboard.dipToneCautious');
    if (tone === 'defensive') return this.lang.t('dashboard.dipToneDefensive');
    return '';
  }

  stockFor(pick: DipPick): StockViewModel | undefined {
    return this.stocks().find((s) => s.symbol === pick.symbol);
  }

  actionLabel(action: DipAction): string {
    if (action === 'buy') return this.lang.t('dashboard.dipBuy');
    if (action === 'watch') return this.lang.t('dashboard.dipWatch');
    return this.lang.t('dashboard.dipSkip');
  }

  actionClasses(action: DipAction): string {
    return dipActionPillClasses(action, this.isDark());
  }

  scoreClasses(action: DipAction): string {
    return dipScoreTextClasses(action, this.isDark());
  }
}
