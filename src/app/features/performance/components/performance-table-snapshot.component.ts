/**
 * Performance Table Snapshot Component
 * Shows top movers / selected stocks performance in table format
 */

import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockComparison } from '../../../core/models/performance.model';
import { ThemeService } from '../../../core/services/theme.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-performance-table-snapshot',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (stocks().length > 0) {
      <div class="rounded-lg border overflow-hidden"
           [class.bg-slate-800/50]="themeService.isDark()"
           [class.border-slate-700]="themeService.isDark()"
           [class.bg-white]="themeService.isLight()"
           [class.border-gray-200]="themeService.isLight()">
        
        <!-- Header -->
        <div class="px-3 py-2 border-b"
             [class.border-slate-700]="themeService.isDark()"
             [class.border-gray-200]="themeService.isLight()">
          <h3 class="text-xs font-semibold"
              [class.text-white]="themeService.isDark()"
              [class.text-gray-900]="themeService.isLight()">
            {{ lang.t('performance.stockComparison') }}
          </h3>
        </div>
        
        <!-- Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead>
              <tr [class.bg-slate-900/50]="themeService.isDark()"
                  [class.bg-gray-50]="themeService.isLight()">
                <th class="px-3 py-2 text-left font-medium"
                    [class.text-slate-400]="themeService.isDark()"
                    [class.text-gray-500]="themeService.isLight()">
                  {{ lang.t('performance.symbol') }}
                </th>
                <th class="px-3 py-2 text-right font-medium"
                    [class.text-slate-400]="themeService.isDark()"
                    [class.text-gray-500]="themeService.isLight()">
                  {{ lang.t('performance.startPrice') }}
                </th>
                <th class="px-3 py-2 text-right font-medium"
                    [class.text-slate-400]="themeService.isDark()"
                    [class.text-gray-500]="themeService.isLight()">
                  {{ lang.t('performance.endPrice') }}
                </th>
                <th class="px-3 py-2 text-right font-medium"
                    [class.text-slate-400]="themeService.isDark()"
                    [class.text-gray-500]="themeService.isLight()">
                  Δ₹
                </th>
                <th class="px-3 py-2 text-right font-medium"
                    [class.text-slate-400]="themeService.isDark()"
                    [class.text-gray-500]="themeService.isLight()">
                  Δ%
                </th>
              </tr>
            </thead>
            <tbody>
              @for (stock of sortedStocks(); track stock.stockId; let i = $index) {
                <tr class="border-t transition"
                    [class.border-slate-700]="themeService.isDark()"
                    [class.border-gray-100]="themeService.isLight()"
                    [class.hover:bg-slate-700/30]="themeService.isDark()"
                    [class.hover:bg-gray-50]="themeService.isLight()">
                  <!-- Symbol with color indicator -->
                  <td class="px-3 py-2">
                    <div class="flex items-center gap-1.5">
                      <span class="w-2.5 h-2.5 rounded-full" [style.backgroundColor]="stock.color"></span>
                      <span class="font-medium"
                            [class.text-white]="themeService.isDark()"
                            [class.text-gray-900]="themeService.isLight()">
                        {{ stock.symbol }}
                      </span>
                    </div>
                  </td>
                  <!-- Start Price -->
                  <td class="px-3 py-2 text-right"
                      [class.text-slate-300]="themeService.isDark()"
                      [class.text-gray-700]="themeService.isLight()">
                    ₹{{ formatNumber(stock.summary?.startPrice || 0) }}
                  </td>
                  <!-- End Price -->
                  <td class="px-3 py-2 text-right"
                      [class.text-slate-300]="themeService.isDark()"
                      [class.text-gray-700]="themeService.isLight()">
                    ₹{{ formatNumber(stock.summary?.endPrice || 0) }}
                  </td>
                  <!-- Absolute Change -->
                  <td class="px-3 py-2 text-right"
                      [class.text-emerald-400]="(stock.summary?.absoluteChange || 0) >= 0"
                      [class.text-red-400]="(stock.summary?.absoluteChange || 0) < 0">
                    {{ (stock.summary?.absoluteChange || 0) >= 0 ? '+' : '' }}₹{{ formatNumber(stock.summary?.absoluteChange || 0) }}
                  </td>
                  <!-- Percentage Change -->
                  <td class="px-3 py-2 text-right font-semibold"
                      [class.text-emerald-400]="(stock.summary?.percentageChange || 0) >= 0"
                      [class.text-red-400]="(stock.summary?.percentageChange || 0) < 0">
                    {{ (stock.summary?.percentageChange || 0) >= 0 ? '+' : '' }}{{ formatNumber(stock.summary?.percentageChange || 0) }}%
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }
  `
})
export class PerformanceTableSnapshotComponent {
  readonly lang = inject(LanguageService);
  readonly themeService = inject(ThemeService);
  
  // Inputs
  stocks = input<StockComparison[]>([]);
  sortBy = input<'change' | 'symbol'>('change');
  
  // Computed sorted stocks
  sortedStocks = () => {
    const stocks = [...this.stocks()];
    if (this.sortBy() === 'change') {
      return stocks.sort((a, b) => 
        (b.summary?.percentageChange || 0) - (a.summary?.percentageChange || 0)
      );
    }
    return stocks.sort((a, b) => a.symbol.localeCompare(b.symbol));
  };
  
  formatNumber(value: number): string {
    return Math.abs(value).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
}
