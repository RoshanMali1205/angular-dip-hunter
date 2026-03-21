/**
 * Performance Summary Cards Component
 * Displays KPI cards: Start Price, End Price, Absolute Change, Percentage Change
 */

import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PerformanceSummary } from '../../../core/models/performance.model';
import { ThemeService } from '../../../core/services/theme.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-performance-summary-cards',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Loading Skeleton -->
    @if (isLoading()) {
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        @for (i of [1,2,3,4]; track i) {
          <div class="rounded-lg p-3 animate-pulse"
               [class.bg-slate-800]="themeService.isDark()"
               [class.bg-white]="themeService.isLight()">
            <div class="h-3 w-16 rounded mb-2"
                 [class.bg-slate-700]="themeService.isDark()"
                 [class.bg-gray-200]="themeService.isLight()"></div>
            <div class="h-5 w-24 rounded"
                 [class.bg-slate-700]="themeService.isDark()"
                 [class.bg-gray-200]="themeService.isLight()"></div>
          </div>
        }
      </div>
    } @else if (summary()) {
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <!-- Start Price -->
        <div class="rounded-lg p-3 border"
             [class.bg-slate-800/50]="themeService.isDark()"
             [class.border-slate-700]="themeService.isDark()"
             [class.bg-white]="themeService.isLight()"
             [class.border-gray-200]="themeService.isLight()"
             [class.shadow-sm]="themeService.isLight()">
          <p class="text-xs font-medium mb-0.5"
             [class.text-slate-400]="themeService.isDark()"
             [class.text-gray-500]="themeService.isLight()">
            {{ lang.t('performance.startPrice') }}
          </p>
          <p class="text-base font-bold"
             [class.text-white]="themeService.isDark()"
             [class.text-gray-900]="themeService.isLight()">
            ₹{{ formatNumber(summary()!.startPrice) }}
          </p>
        </div>
        
        <!-- End Price -->
        <div class="rounded-lg p-3 border"
             [class.bg-slate-800/50]="themeService.isDark()"
             [class.border-slate-700]="themeService.isDark()"
             [class.bg-white]="themeService.isLight()"
             [class.border-gray-200]="themeService.isLight()"
             [class.shadow-sm]="themeService.isLight()">
          <p class="text-xs font-medium mb-0.5"
             [class.text-slate-400]="themeService.isDark()"
             [class.text-gray-500]="themeService.isLight()">
            {{ lang.t('performance.endPrice') }}
          </p>
          <p class="text-base font-bold"
             [class.text-white]="themeService.isDark()"
             [class.text-gray-900]="themeService.isLight()">
            ₹{{ formatNumber(summary()!.endPrice) }}
          </p>
        </div>
        
        <!-- Absolute Change -->
        <div class="rounded-lg p-3 border"
             [class.bg-slate-800/50]="themeService.isDark()"
             [class.border-slate-700]="themeService.isDark()"
             [class.bg-white]="themeService.isLight()"
             [class.border-gray-200]="themeService.isLight()"
             [class.shadow-sm]="themeService.isLight()">
          <p class="text-xs font-medium mb-0.5"
             [class.text-slate-400]="themeService.isDark()"
             [class.text-gray-500]="themeService.isLight()">
            {{ lang.t('performance.absoluteChange') }}
          </p>
          <p class="text-base font-bold flex items-center gap-1"
             [class.text-emerald-400]="summary()!.absoluteChange >= 0"
             [class.text-red-400]="summary()!.absoluteChange < 0">
            @if (summary()!.absoluteChange >= 0) {
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            } @else {
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            }
            {{ summary()!.absoluteChange >= 0 ? '+' : '' }}₹{{ formatNumber(summary()!.absoluteChange) }}
          </p>
        </div>
        
        <!-- Percentage Change -->
        <div class="rounded-lg p-3 border"
             [class.border-emerald-500/30]="summary()!.percentageChange >= 0"
             [class.border-red-500/30]="summary()!.percentageChange < 0"
             [class.bg-emerald-500/10]="summary()!.percentageChange >= 0 && themeService.isDark()"
             [class.bg-red-500/10]="summary()!.percentageChange < 0 && themeService.isDark()"
             [class.bg-emerald-50]="summary()!.percentageChange >= 0 && themeService.isLight()"
             [class.bg-red-50]="summary()!.percentageChange < 0 && themeService.isLight()">
          <p class="text-xs font-medium mb-0.5"
             [class.text-slate-400]="themeService.isDark()"
             [class.text-gray-500]="themeService.isLight()">
            {{ lang.t('performance.percentageChange') }}
          </p>
          <p class="text-lg font-bold flex items-center gap-1"
             [class.text-emerald-400]="summary()!.percentageChange >= 0"
             [class.text-red-400]="summary()!.percentageChange < 0">
            @if (summary()!.percentageChange >= 0) {
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            } @else {
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            }
            {{ summary()!.percentageChange >= 0 ? '+' : '' }}{{ formatNumber(summary()!.percentageChange) }}%
          </p>
        </div>
      </div>
    } @else {
      <div class="text-center py-8"
           [class.text-slate-400]="themeService.isDark()"
           [class.text-gray-500]="themeService.isLight()">
        {{ lang.t('performance.noData') }}
      </div>
    }
  `
})
export class PerformanceSummaryCardsComponent {
  readonly lang = inject(LanguageService);
  readonly themeService = inject(ThemeService);
  
  // Inputs
  summary = input<PerformanceSummary | null>(null);
  isLoading = input(false);
  
  formatNumber(value: number): string {
    return Math.abs(value).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
}
