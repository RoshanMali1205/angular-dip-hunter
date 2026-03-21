/**
 * Portfolio Insights Card Component
 * Displays AI-powered portfolio insights on dashboard
 */

import { Component, input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioInsightsService, PortfolioInsight } from '../../../core/services';
import { FolderId } from '../../../core/models/folder.model';
import { ThemeService } from '../../../core/services';

@Component({
  selector: 'app-portfolio-insights-card',
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
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold flex items-center gap-2"
            [class.text-white]="isDark()"
            [class.text-gray-900]="!isDark()">
          💡 AI Portfolio Summary
        </h3>
      </div>

      @if (insights().length === 0) {
        <div class="text-xs text-center py-4"
             [class.text-slate-400]="isDark()"
             [class.text-gray-400]="!isDark()">
          No holdings to analyze
        </div>
      } @else {
        <!-- Top 3 Insights -->
        <div class="space-y-2">
          @for (insight of topInsights(); track insight.title; let i = $index) {
            <div class="rounded-lg border p-2.5 text-xs"
                 [class]="getSeverityClasses(insight.severity)">
              
              <!-- Insight Header -->
              <div class="flex items-start gap-2">
                <span class="shrink-0 mt-0.5">{{ getSeverityIcon(insight.severity) }}</span>
                <div class="flex-1 min-w-0">
                  <p class="font-medium line-clamp-1">{{ insight.title }}</p>
                  <p class="text-[10px] mt-0.5 opacity-90 line-clamp-2">{{ insight.message }}</p>
                </div>
                @if (insight.metric !== undefined) {
                  <div class="shrink-0 text-right">
                    <p class="font-bold">{{ formatMetric(insight.metric) }}</p>
                    <p class="text-[9px] opacity-75">{{ insight.metricLabel }}</p>
                  </div>
                }
              </div>

              <!-- Recommendation (hover tooltip) -->
              <p class="text-[9px] mt-1.5 opacity-75 border-t border-current border-opacity-20 pt-1.5"
                 [title]="insight.recommendation">
                📌 {{ insight.recommendation | slice:0:60 }}{{ insight.recommendation.length > 60 ? '...' : '' }}
              </p>
            </div>
          }
        </div>

        <!-- Meta Info -->
        <div class="mt-3 pt-3 border-t text-[10px]"
             [class.border-slate-700/30]="isDark()"
             [class.border-gray-200]="!isDark()">
          <div class="flex items-center justify-between"
               [class.text-slate-400]="isDark()"
               [class.text-gray-500]="!isDark()">
            <span>{{ insights().length }} total insights</span>
            <span class="text-[9px]">Last updated: just now</span>
          </div>
        </div>
      }
    </div>
  `
})
export class PortfolioInsightsCardComponent {
  folderId = input<FolderId>();
  isDark = inject(ThemeService).isDark;
  private insightsService = inject(PortfolioInsightsService);

  insights = computed(() => this.insightsService.getInsights(this.folderId() ?? undefined));

  topInsights = computed(() => this.insights().slice(0, 3));

  getSeverityIcon(severity: string): string {
    const icons: Record<string, string> = {
      critical: '🔴',
      warning: '🟡',
      info: '🟢'
    };
    return icons[severity] || '•';
  }

  getSeverityClasses(severity: string): string {
    const isDarkMode = this.isDark();
    const baseClasses = 'rounded-lg border p-2.5 text-xs transition-colors';

    switch (severity) {
      case 'critical':
        return isDarkMode
          ? 'border-red-500/40 bg-red-950/30 text-red-200'
          : 'border-red-200 bg-red-50 text-red-900';
      case 'warning':
        return isDarkMode
          ? 'border-amber-500/40 bg-amber-950/30 text-amber-200'
          : 'border-amber-200 bg-amber-50 text-amber-900';
      case 'info':
        return isDarkMode
          ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200'
          : 'border-emerald-200 bg-emerald-50 text-emerald-900';
      default:
        return baseClasses;
    }
  }

  formatMetric(value: number): string {
    if (Math.abs(value) >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    if (Number.isInteger(value)) {
      return value.toString();
    }
    return value.toFixed(1);
  }
}
