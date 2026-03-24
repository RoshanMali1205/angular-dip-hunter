/**
 * Allocation Suggestions Component
 * Shows 3 investment strategy cards for comparison, then a detailed breakdown.
 */

import { Component, input, output, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AllocationAdvisorService } from '../../../core/services';
import { CurrencyDisplayPipe } from '../../../shared/pipes/currency-display.pipe';
import { AdvisorStrategy, AllocationSuggestion } from '../../../core/models/plan.model';
import { StockViewModel } from '../../../core/models';
import { ThemeService } from '../../../core/services';

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
              3 strategies · {{ budget() | currencyDisplay }} · {{ stocks().length }} red stocks
            </p>
          </div>
        </div>
        <!-- Recommendation badge -->
        <span class="hidden sm:flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
              [class.bg-blue-500/15]="isDark()"
              [class.text-blue-300]="isDark()"
              [class.bg-blue-50]="!isDark()"
              [class.text-blue-700]="!isDark()">
          🎯 Recommended: {{ getStrategyShortLabel(recommendation().strategy) }}
        </span>
      </div>

      <!-- Strategy Comparison Cards (3 side-by-side) -->
      <div class="p-4">
        <div class="flex gap-2 mb-4 overflow-x-auto pb-2 snap-x snap-mandatory
                    sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
          @for (s of suggestions(); track s.strategy) {
            <button
              (click)="selectedStrategy.set(s.strategy)"
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

              <!-- Recommended star -->
              @if (recommendation().strategy === s.strategy) {
                <span class="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-white text-[9px]">★</span>
              }

              <!-- Strategy icon + name -->
              <div class="text-lg mb-1.5">{{ getStrategyIcon(s.strategy) }}</div>
              <p class="text-xs font-semibold leading-tight"
                 [class.text-white]="isDark()"
                 [class.text-gray-900]="!isDark()">{{ s.name }}</p>

              <!-- Risk badge -->
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

              <!-- Expected return -->
              <p class="mt-1 text-xs font-semibold"
                 [class.text-emerald-400]="isDark()"
                 [class.text-emerald-600]="!isDark()">{{ s.expectedReturn }}</p>

              <!-- Selected indicator -->
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
        </div>

        <!-- Selected Strategy Detail -->
        <div class="rounded-xl border p-3 space-y-3"
             [class.border-slate-700/40]="isDark()"
             [class.bg-slate-800/30]="isDark()"
             [class.border-gray-100]="!isDark()"
             [class.bg-gray-50]="!isDark()">

          <!-- Strategy description + rationale -->
          <div>
            <p class="text-sm font-medium"
               [class.text-white]="isDark()"
               [class.text-gray-900]="!isDark()">{{ selectedSuggestion().description }}</p>
            <p class="text-xs mt-1"
               [class.text-slate-400]="isDark()"
               [class.text-gray-500]="!isDark()">{{ selectedSuggestion().rationale }}</p>
          </div>

          <!-- Allocation Breakdown label -->
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold uppercase tracking-wide"
               [class.text-slate-400]="isDark()"
               [class.text-gray-500]="!isDark()">Allocation Breakdown</p>
            <span class="text-xs"
                  [class.text-slate-500]="isDark()"
                  [class.text-gray-400]="!isDark()">
              {{ selectedSuggestion().allocations.length }} stocks
            </span>
          </div>

          <!-- Allocation rows -->
          <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            @for (alloc of selectedSuggestion().allocations; track alloc.symbol) {
              <div class="flex items-center gap-2">
                <!-- Symbol + reason -->
                <div class="w-20 shrink-0">
                  <p class="text-xs font-semibold"
                     [class.text-white]="isDark()"
                     [class.text-gray-900]="!isDark()">{{ alloc.symbol }}</p>
                  <p class="text-xs leading-tight"
                     [class.text-slate-500]="isDark()"
                     [class.text-gray-400]="!isDark()">{{ alloc.reason }}</p>
                </div>
                <!-- Progress bar -->
                <div class="flex-1 rounded-full h-1.5"
                     [class.bg-slate-700]="isDark()"
                     [class.bg-gray-200]="!isDark()">
                  <div class="h-1.5 rounded-full bg-emerald-500 transition-all"
                       [style.width.%]="alloc.percentage"></div>
                </div>
                <!-- Amount + % -->
                <div class="text-right shrink-0 w-20">
                  <p class="text-xs font-semibold text-emerald-400">{{ alloc.allocation | currencyDisplay }}</p>
                  <p class="text-xs"
                     [class.text-slate-500]="isDark()"
                     [class.text-gray-400]="!isDark()">{{ alloc.percentage.toFixed(1) }}%</p>
                </div>
              </div>
            }
          </div>

          <!-- Apply Button -->
          <button
            (click)="onApplyAllocation.emit(selectedSuggestion())"
            class="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition
                   bg-gradient-to-r from-emerald-600 to-cyan-600
                   hover:from-emerald-500 hover:to-cyan-500
                   active:scale-[0.99] shadow-sm">
            ✓ Apply {{ selectedSuggestion().name }} to Plan
          </button>
        </div>
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

  selectedStrategy = signal<AdvisorStrategy>('equal');

  suggestions = computed(() =>
    this.advisorService.suggestAllocations(this.stocks(), this.budget())
  );

  recommendation = computed(() =>
    this.advisorService.getRecommendation(this.stocks())
  );

  selectedSuggestion = computed(() => {
    const strategy = this.selectedStrategy();
    return this.suggestions().find(s => s.strategy === strategy) ?? this.suggestions()[0];
  });

  getStrategyIcon(strategy: AdvisorStrategy): string {
    return { equal: '⚖️', 'risk-adjusted': '📊', defensive: '🛡️' }[strategy] ?? '💡';
  }

  getStrategyShortLabel(strategy: AdvisorStrategy): string {
    return { equal: 'Equal Weight', 'risk-adjusted': 'Risk-Adjusted', defensive: 'Defensive' }[strategy] ?? strategy;
  }
}
