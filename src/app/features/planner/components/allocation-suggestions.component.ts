/**
 * Allocation Suggestions Component
 * Shows heuristic strategy cards plus an optional Gemini Advisor card.
 */

import {
  Component,
  input,
  output,
  inject,
  computed,
  signal,
  effect,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AllocationAdvisorService, LanguageService, ThemeService } from '../../../core/services';
import { CurrencyDisplayPipe } from '../../../shared/pipes/currency-display.pipe';
import { AdvisorStrategy, AllocationSuggestion } from '../../../core/models/plan.model';
import { StockViewModel } from '../../../core/models';

@Component({
  selector: 'app-allocation-suggestions',
  standalone: true,
  imports: [CommonModule, CurrencyDisplayPipe],
  template: `
    <div class="rounded-xl border overflow-hidden"
         [class.border-slate-700/50]="isDark()"
         [class.bg-slate-900]="isDark()"
         [class.border-gray-200]="!isDark()"
         [class.bg-white]="!isDark()">

      <!-- Header -->
      <div class="px-4 py-3 border-b flex items-center justify-between"
           [class.border-slate-700/50]="isDark()"
           [class.bg-slate-800/60]="isDark()"
           [class.border-gray-100]="!isDark()"
           [class.bg-gray-50]="!isDark()">
        <div class="flex items-center gap-2">
          <div>
            <h3 class="text-sm font-semibold"
                [class.text-white]="isDark()"
                [class.text-gray-900]="!isDark()">Smart Allocation</h3>
            <p class="text-xs"
               [class.text-slate-400]="isDark()"
               [class.text-gray-500]="!isDark()">
              {{ strategyCountLabel() }} · {{ budget() | currencyDisplay }} · {{ stocks().length }} red stocks
            </p>
          </div>
        </div>
        <!-- Recommendation badge -->
        <span class="hidden sm:flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
              [class.bg-blue-500/15]="isDark()"
              [class.text-blue-300]="isDark()"
              [class.bg-blue-50]="!isDark()"
              [class.text-blue-700]="!isDark()">
          Recommended: {{ getStrategyShortLabel(activeRecommendation().strategy) }}
        </span>
      </div>

      <!-- Strategy Comparison Cards -->
      <div class="p-4">
        <div class="flex gap-2 mb-4 overflow-x-auto pb-2 snap-x snap-mandatory sm:overflow-visible sm:pb-0"
             [ngClass]="suggestions().length >= 4 ? 'sm:grid sm:grid-cols-4' : 'sm:grid sm:grid-cols-3'">
          @for (s of suggestions(); track s.strategy) {
            <button
              (click)="selectStrategy(s.strategy)"
              class="relative rounded-xl border p-3 text-left transition-all min-w-[130px] shrink-0 snap-start
                     sm:min-w-0 sm:shrink"
              [class.border-emerald-500]="selectedStrategy() === s.strategy && isDark()"
              [class.bg-emerald-500/10]="selectedStrategy() === s.strategy && isDark()"
              [class.shadow-emerald-500/10]="selectedStrategy() === s.strategy && isDark()"
              [class.shadow-md]="selectedStrategy() === s.strategy"
              [class.border-emerald-400]="selectedStrategy() === s.strategy && !isDark()"
              [class.bg-emerald-50]="selectedStrategy() === s.strategy && !isDark()"
              [class.border-slate-700/40]="selectedStrategy() !== s.strategy && isDark()"
              [class.bg-slate-800/40]="selectedStrategy() !== s.strategy && isDark()"
              [class.border-gray-200]="selectedStrategy() !== s.strategy && !isDark()"
              [class.bg-gray-50]="selectedStrategy() !== s.strategy && !isDark()"
              [class.hover:border-slate-600]="selectedStrategy() !== s.strategy && isDark()"
              [class.hover:border-gray-300]="selectedStrategy() !== s.strategy && !isDark()">

              @if (activeRecommendation().strategy === s.strategy) {
                <span class="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-white text-[9px]">★</span>
              }

              <div class="text-lg mb-1.5">{{ getStrategyIcon(s.strategy) }}</div>
              <p class="text-xs font-semibold leading-tight"
                 [class.text-white]="isDark()"
                 [class.text-gray-900]="!isDark()">{{ s.name }}</p>

              <span class="mt-1.5 inline-block rounded-full px-1.5 py-0.5 text-xs font-medium capitalize"
                    [class.bg-red-500/15]="s.riskProfile === 'aggressive' && isDark()"
                    [class.text-red-300]="s.riskProfile === 'aggressive' && isDark()"
                    [class.bg-red-50]="s.riskProfile === 'aggressive' && !isDark()"
                    [class.text-red-600]="s.riskProfile === 'aggressive' && !isDark()"
                    [class.bg-amber-500/15]="s.riskProfile === 'balanced' && isDark()"
                    [class.text-amber-300]="s.riskProfile === 'balanced' && isDark()"
                    [class.bg-amber-50]="s.riskProfile === 'balanced' && !isDark()"
                    [class.text-amber-600]="s.riskProfile === 'balanced' && !isDark()"
                    [class.bg-emerald-500/15]="s.riskProfile === 'conservative' && isDark()"
                    [class.text-emerald-300]="s.riskProfile === 'conservative' && isDark()"
                    [class.bg-emerald-50]="s.riskProfile === 'conservative' && !isDark()"
                    [class.text-emerald-600]="s.riskProfile === 'conservative' && !isDark()">
                {{ s.riskProfile }}
              </span>

              <p class="mt-1 text-xs font-semibold"
                 [class.text-emerald-400]="isDark()"
                 [class.text-emerald-600]="!isDark()">{{ s.expectedReturn }}</p>

              @if (selectedStrategy() === s.strategy) {
                <div class="mt-2 flex items-center gap-1 text-xs"
                     [class.text-emerald-400]="isDark()"
                     [class.text-emerald-600]="!isDark()">
                  <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/>
                  </svg>
                  Selected
                </div>
              }
            </button>
          }

          @if (geminiLoading()) {
            <div class="rounded-xl border border-dashed p-3 min-w-[130px] shrink-0 snap-start sm:min-w-0
                        flex flex-col justify-center"
                 [class.border-slate-700/40]="isDark()"
                 [class.bg-slate-800/20]="isDark()"
                 [class.border-gray-200]="!isDark()"
                 [class.bg-gray-50]="!isDark()">
              <p class="text-xs font-semibold"
                 [class.text-white]="isDark()"
                 [class.text-gray-900]="!isDark()">Gemini Advisor</p>
              <p class="mt-1 text-xs"
                 [class.text-slate-400]="isDark()"
                 [class.text-gray-500]="!isDark()">Asking Gemini…</p>
            </div>
          }
        </div>

        <!-- Selected Strategy Detail -->
        @if (selectedSuggestion(); as selected) {
          <div class="rounded-xl border p-3 space-y-3"
               [class.border-slate-700/40]="isDark()"
               [class.bg-slate-800/30]="isDark()"
               [class.border-gray-100]="!isDark()"
               [class.bg-gray-50]="!isDark()">

            <div>
              <p class="text-sm font-medium"
                 [class.text-white]="isDark()"
                 [class.text-gray-900]="!isDark()">{{ selected.description }}</p>
              <p class="text-xs mt-1"
                 [class.text-slate-400]="isDark()"
                 [class.text-gray-500]="!isDark()">{{ selected.rationale }}</p>
              @if (selected.disclaimer) {
                <p class="text-xs mt-1 italic"
                   [class.text-slate-500]="isDark()"
                   [class.text-gray-400]="!isDark()">{{ selected.disclaimer }}</p>
              }
            </div>

            <div class="rounded-xl border overflow-hidden"
                 [class.border-slate-700/50]="isDark()"
                 [class.bg-slate-900/50]="isDark()"
                 [class.border-gray-200]="!isDark()"
                 [class.bg-white]="!isDark()">
              <div class="flex items-center justify-between gap-2 px-3 py-2 border-b"
                   [class.border-slate-700/50]="isDark()"
                   [class.border-gray-100]="!isDark()">
                <p class="text-xs font-semibold uppercase tracking-wide"
                   [class.text-slate-400]="isDark()"
                   [class.text-gray-500]="!isDark()">{{ lang.t('planner.allocationBreakdown') }}</p>
                <span class="text-xs tabular-nums"
                      [class.text-slate-500]="isDark()"
                      [class.text-gray-400]="!isDark()">
                  {{ rankedAllocations().length }} {{ lang.t('common.stocks') }}
                </span>
              </div>

              <div class="divide-y max-h-[min(28rem,55vh)] overflow-y-auto"
                   [class.divide-slate-700/40]="isDark()"
                   [class.divide-gray-100]="!isDark()">
                @for (alloc of visibleAllocations(); track alloc.symbol) {
                  <div class="px-3 py-2.5">
                    <div class="flex items-start gap-2.5">
                      <span class="mt-0.5 w-5 shrink-0 text-right text-[11px] font-semibold tabular-nums"
                            [class.text-slate-500]="isDark()"
                            [class.text-gray-400]="!isDark()">{{ alloc.rank }}</span>
                      <div class="min-w-0 flex-1">
                        <div class="flex items-baseline justify-between gap-3">
                          <p class="text-sm font-semibold truncate"
                             [class.text-white]="isDark()"
                             [class.text-gray-900]="!isDark()">{{ alloc.symbol }}</p>
                          <div class="shrink-0 text-right">
                            <p class="text-sm font-semibold tabular-nums text-emerald-400">{{ alloc.allocation | currencyDisplay }}</p>
                            <p class="text-[11px] tabular-nums"
                               [class.text-slate-500]="isDark()"
                               [class.text-gray-400]="!isDark()">{{ alloc.percentage.toFixed(1) }}%</p>
                          </div>
                        </div>
                        <div class="mt-1.5 h-2 rounded-full overflow-hidden"
                             [class.bg-slate-700]="isDark()"
                             [class.bg-gray-200]="!isDark()">
                          <div class="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all"
                               [style.width.%]="barWidth(alloc.percentage)"></div>
                        </div>
                        @if (alloc.reason) {
                          <p class="mt-1.5 text-[11px] leading-snug line-clamp-2"
                             [class.text-slate-400]="isDark()"
                             [class.text-gray-500]="!isDark()">{{ alloc.reason }}</p>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>

              @if (rankedAllocations().length > previewCount && !showAllAllocations()) {
                <button type="button"
                        (click)="showAllAllocations.set(true)"
                        class="w-full px-3 py-2 text-xs font-medium border-t transition"
                        [class.border-slate-700/50]="isDark()"
                        [class.text-emerald-400]="isDark()"
                        [class.hover:bg-slate-800/80]="isDark()"
                        [class.border-gray-100]="!isDark()"
                        [class.text-emerald-600]="!isDark()"
                        [class.hover:bg-gray-50]="!isDark()">
                  {{ lang.t('planner.showAllStocks', { count: rankedAllocations().length }) }}
                </button>
              } @else if (rankedAllocations().length > previewCount) {
                <button type="button"
                        (click)="showAllAllocations.set(false)"
                        class="w-full px-3 py-2 text-xs font-medium border-t transition"
                        [class.border-slate-700/50]="isDark()"
                        [class.text-slate-300]="isDark()"
                        [class.hover:bg-slate-800/80]="isDark()"
                        [class.border-gray-100]="!isDark()"
                        [class.text-gray-600]="!isDark()"
                        [class.hover:bg-gray-50]="!isDark()">
                  {{ lang.t('planner.showFewer') }}
                </button>
              }
            </div>

            <button
              (click)="onApplyAllocation.emit(selected)"
              class="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition
                     bg-gradient-to-r from-emerald-600 to-cyan-600
                     hover:from-emerald-500 hover:to-cyan-500
                     active:scale-[0.99] shadow-sm">
              {{ lang.t('planner.applyAdvisor', { name: selected.name }) }}
            </button>
          </div>
        }
      </div>
    </div>
  `
})
export class AllocationSuggestionsComponent {
  stocks = input.required<StockViewModel[]>();
  budget = input.required<number>();

  onApplyAllocation = output<AllocationSuggestion>();

  isDark = inject(ThemeService).isDark;
  private advisorService = inject(AllocationAdvisorService);
  protected lang = inject(LanguageService);

  selectedStrategy = signal<AdvisorStrategy>('equal');
  geminiSuggestion = signal<AllocationSuggestion | null>(null);
  geminiLoading = signal(false);
  showAllAllocations = signal(false);
  readonly previewCount = 8;

  private heuristicSuggestions = computed(() =>
    this.advisorService.suggestAllocations(this.stocks(), this.budget())
  );

  suggestions = computed(() => {
    const base = this.heuristicSuggestions();
    const gemini = this.geminiSuggestion();
    return gemini ? [...base, gemini] : base;
  });

  strategyCountLabel = computed(() => {
    const n = this.suggestions().length;
    const loading = this.geminiLoading();
    if (loading) return `${n} strategies · Gemini loading`;
    return `${n} strateg${n === 1 ? 'y' : 'ies'}`;
  });

  recommendation = computed(() =>
    this.advisorService.getRecommendation(this.stocks())
  );

  activeRecommendation = computed(() => {
    if (this.geminiSuggestion()) {
      return {
        strategy: 'gemini' as const,
        reason: 'Gemini available — review the model-weighted split first.',
      };
    }
    return this.recommendation();
  });

  selectedSuggestion = computed(() => {
    const strategy = this.selectedStrategy();
    return this.suggestions().find(s => s.strategy === strategy) ?? this.suggestions()[0];
  });

  rankedAllocations = computed(() => {
    const selected = this.selectedSuggestion();
    if (!selected) return [];
    return [...selected.allocations]
      .sort((a, b) => b.percentage - a.percentage || a.symbol.localeCompare(b.symbol))
      .map((alloc, index) => ({ ...alloc, rank: index + 1 }));
  });

  visibleAllocations = computed(() => {
    const all = this.rankedAllocations();
    if (this.showAllAllocations() || all.length <= this.previewCount) return all;
    return all.slice(0, this.previewCount);
  });

  constructor() {
    effect((onCleanup) => {
      const stocks = this.stocks();
      const budget = this.budget();
      const symbolsKey = stocks.map((s) => s.symbol).join(',');

      untracked(() => {
        this.geminiSuggestion.set(null);
        this.showAllAllocations.set(false);
        if (!stocks.length || budget <= 0) {
          this.geminiLoading.set(false);
          return;
        }

        this.geminiLoading.set(true);
        const sub = this.advisorService.fetchGeminiAllocation(stocks, budget).subscribe((suggestion) => {
          // Ignore stale responses if inputs changed
          const currentKey = this.stocks().map((s) => s.symbol).join(',');
          if (currentKey !== symbolsKey || this.budget() !== budget) return;

          this.geminiSuggestion.set(suggestion);
          this.geminiLoading.set(false);
          if (suggestion && this.selectedStrategy() === 'equal') {
            this.selectedStrategy.set('gemini');
          }
        });
        onCleanup(() => sub.unsubscribe());
      });
    });
  }

  selectStrategy(strategy: AdvisorStrategy): void {
    this.selectedStrategy.set(strategy);
    this.showAllAllocations.set(false);
  }

  getStrategyIcon(strategy: AdvisorStrategy): string {
    return {
      equal: '⚖️',
      'risk-adjusted': '📊',
      defensive: '🛡️',
      gemini: '✨',
    }[strategy] ?? '💡';
  }

  getStrategyShortLabel(strategy: AdvisorStrategy): string {
    return {
      equal: 'Equal Weight',
      'risk-adjusted': 'Risk-Adjusted',
      defensive: 'Defensive',
      gemini: 'Gemini',
    }[strategy] ?? strategy;
  }

  barWidth(percentage: number): number {
    if (!Number.isFinite(percentage) || percentage <= 0) return 0;
    return Math.min(100, Math.max(4, percentage));
  }
}
