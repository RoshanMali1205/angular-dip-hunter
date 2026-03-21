/**
 * Allocation Suggestions Component
 * Displays AI allocation strategies for planner budget
 */

import { Component, input, output, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AllocationAdvisorService } from '../../../core/services';
import { AdvisorStrategy, AllocationSuggestion } from '../../../core/models/plan.model';
import { StockViewModel } from '../../../core/models';
import { ThemeService } from '../../../core/services';

@Component({
  selector: 'app-allocation-suggestions',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-xl border p-4"
         [class.border-slate-700/50]="isDark()"
         [class.bg-gradient-to-br]="true"
         [class.from-slate-900]="isDark()"
         [class.to-slate-800/90]="isDark()"
         [class.border-gray-200]="!isDark()"
         [class.from-white]="!isDark()"
         [class.to-gray-50]="!isDark()">
      
      <!-- Header -->
      <div class="mb-4">
        <h3 class="text-sm font-semibold"
            [class.text-white]="isDark()"
            [class.text-gray-900]="!isDark()">
          💡 AI Allocation Suggestions
        </h3>
        <p class="text-xs mt-1"
           [class.text-slate-400]="isDark()"
           [class.text-gray-500]="!isDark()">
          Budget: ₹{{ formatCurrency(budget()) }} across {{ stocks().length }} stocks
        </p>
      </div>

      <!-- Recommendation Alert -->
      @if (recommendation()) {
        <div class="mb-4 rounded-lg border p-3 text-xs"
             [class.border-blue-500/30]="isDark()"
             [class.bg-blue-950/20]="isDark()"
             [class.text-blue-200]="isDark()"
             [class.border-blue-200]="!isDark()"
             [class.bg-blue-50]="!isDark()"
             [class.text-blue-900]="!isDark()">
          <p class="font-medium">🎯 Recommended: {{ getStrategyLabel(recommendation() !.strategy) }}</p>
          <p class="mt-1 opacity-90">{{ recommendation() !.reason }}</p>
        </div>
      }

      <!-- Strategy Tabs -->
      <div class="flex gap-2 mb-4 border-b rounded-t-lg overflow-x-auto"
           [class.border-slate-700/30]="isDark()"
           [class.border-gray-200]="!isDark()">
        @for (suggestion of suggestions(); track suggestion.strategy) {
          <button
            (click)="selectedStrategy.set(suggestion.strategy)"
            [class]="selectedStrategy() === suggestion.strategy
              ? (isDark() ? 'border-emerald-500 text-emerald-400 border-b-2' : 'border-emerald-500 text-emerald-600 border-b-2')
              : (isDark() ? 'text-slate-400 hover:text-slate-300' : 'text-gray-500 hover:text-gray-700')"
            class="px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 border-transparent transition">
            {{ suggestion.name }}
          </button>
        }
      </div>

      <!-- Selected Strategy Details -->
      <div class="space-y-4">
        <!-- Description -->
        <div>
          <p class="text-xs font-medium uppercase tracking-wide"
             [class.text-slate-400]="isDark()"
             [class.text-gray-500]="!isDark()">
            Strategy
          </p>
          <p class="text-sm mt-1"
             [class.text-slate-300]="isDark()"
             [class.text-gray-700]="!isDark()">
            {{ selectedSuggestion().description }}
          </p>
        </div>

        <!-- Rationale -->
        <div class="rounded-lg border p-3 text-xs"
             [class.border-slate-700/30]="isDark()"
             [class.bg-slate-800/30]="isDark()"
             [class.text-slate-300]="isDark()"
             [class.border-gray-200]="!isDark()"
             [class.bg-gray-50]="!isDark()"
             [class.text-gray-700]="!isDark()">
          <p class="font-medium mb-1">Why this strategy?</p>
          <p>{{ selectedSuggestion().rationale }}</p>
        </div>

        <!-- Risk & Return -->
        <div class="grid grid-cols-2 gap-3">
          <div class="rounded-lg border p-2"
               [class.border-slate-700/30]="isDark()"
               [class.bg-slate-800/30]="isDark()">
            <p class="text-[10px] uppercase text-slate-400">Risk Profile</p>
            <p class="text-sm font-semibold mt-0.5 capitalize"
               [class.text-slate-200]="isDark()">
              {{ selectedSuggestion().riskProfile }}
            </p>
          </div>
          <div class="rounded-lg border p-2"
               [class.border-slate-700/30]="isDark()"
               [class.bg-slate-800/30]="isDark()">
            <p class="text-[10px] uppercase text-slate-400">Expected Return</p>
            <p class="text-sm font-semibold mt-0.5"
               [class.text-emerald-400]="isDark()"
               [class.text-emerald-600]="!isDark()">
              {{ selectedSuggestion().expectedReturn }}
            </p>
          </div>
        </div>

        <!-- Allocation Breakdown -->
        <div>
          <p class="text-xs font-medium uppercase tracking-wide mb-2"
             [class.text-slate-400]="isDark()"
             [class.text-gray-500]="!isDark()">
            Allocation Breakdown
          </p>
          <div class="space-y-2 max-h-56 overflow-y-auto">
            @for (alloc of selectedSuggestion().allocations; track alloc.symbol) {
              <div class="rounded-lg border p-2.5 text-xs"
                   [class.border-slate-700/30]="isDark()"
                   [class.bg-slate-800/20]="isDark()">
                <div class="flex items-center justify-between mb-1.5">
                  <span class="font-medium">{{ alloc.symbol }}</span>
                  <span class="font-bold text-emerald-400">₹{{ formatCurrency(alloc.allocation) }}</span>
                </div>
                <div class="flex items-center justify-between text-[10px]">
                  <span [class.text-slate-400]="isDark()">{{ alloc.percentage.toFixed(1) }}% allocation</span>
                  <span [class.text-slate-500]="isDark()"
                        [class.text-gray-600]="!isDark()">
                    {{ alloc.reason }}
                  </span>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Apply Button -->
        <button
          (click)="onApplyAllocation.emit(selectedSuggestion()!)"
          class="w-full py-2 px-4 rounded-lg font-medium text-sm transition mt-2"
          [class.bg-emerald-600]="isDark()"
          [class.hover:bg-emerald-500]="isDark()"
          [class.text-white]="isDark()"
          [class.bg-emerald-500]="!isDark()"
          [class.hover:bg-emerald-600]="!isDark()">
          Apply This Allocation
        </button>
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
    const suggestions = this.suggestions();
    return suggestions.find(s => s.strategy === strategy) ?? suggestions[0];
  });

  getStrategyLabel(strategy: AdvisorStrategy): string {
    const labels: Record<AdvisorStrategy, string> = {
      equal: '⚖️ Equal Weight',
      'risk-adjusted': '📊 Risk-Adjusted',
      defensive: '🛡️ Defensive Mode'
    };
    return labels[strategy];
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }
}
