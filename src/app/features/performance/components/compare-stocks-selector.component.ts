/**
 * Compare Stocks Selector Component
 * Multi-select dropdown for comparing stocks in a folder
 */

import { Component, input, output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Stock } from '../../../core/models/stock.model';
import { ThemeService } from '../../../core/services/theme.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-compare-stocks-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative">
      <!-- Trigger Button -->
      <button
        (click)="toggleDropdown()"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition"
        [class.bg-slate-800]="themeService.isDark()"
        [class.border-slate-700]="themeService.isDark()"
        [class.text-slate-300]="themeService.isDark()"
        [class.hover:bg-slate-700]="themeService.isDark()"
        [class.bg-white]="themeService.isLight()"
        [class.border-gray-300]="themeService.isLight()"
        [class.text-gray-700]="themeService.isLight()"
        [class.hover:bg-gray-50]="themeService.isLight()">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        {{ lang.t('performance.compare') }}
        @if (selectedCount() > 0) {
          <span class="px-1.5 py-0.5 text-[10px] rounded-full bg-emerald-500 text-white">
            {{ selectedCount() }}
          </span>
        }
        <svg class="w-3.5 h-3.5 transition-transform" 
             [class.rotate-180]="isOpen()"
             fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      <!-- Dropdown Panel -->
      @if (isOpen()) {
        <div class="absolute right-0 mt-2 w-72 rounded-lg border shadow-xl z-50"
             [class.bg-slate-900]="themeService.isDark()"
             [class.border-slate-700]="themeService.isDark()"
             [class.bg-white]="themeService.isLight()"
             [class.border-gray-200]="themeService.isLight()">
          
          <!-- Header -->
          <div class="px-4 py-3 border-b"
               [class.border-slate-700]="themeService.isDark()"
               [class.border-gray-200]="themeService.isLight()">
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium"
                 [class.text-white]="themeService.isDark()"
                 [class.text-gray-900]="themeService.isLight()">
                {{ lang.t('performance.selectStocks') }}
              </p>
              <p class="text-xs"
                 [class.text-slate-400]="themeService.isDark()"
                 [class.text-gray-500]="themeService.isLight()">
                {{ selectedCount() }}/{{ maxSelection() }}
              </p>
            </div>
          </div>
          
          <!-- Stock List -->
          <div class="max-h-64 overflow-y-auto p-2">
            @for (stock of stocks(); track stock.id) {
              <label
                class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition"
                [class.bg-emerald-500/10]="isSelected(stock.id)"
                [class.hover:bg-slate-800]="!isSelected(stock.id) && themeService.isDark()"
                [class.hover:bg-gray-100]="!isSelected(stock.id) && themeService.isLight()">
                <input
                  type="checkbox"
                  [checked]="isSelected(stock.id)"
                  [disabled]="!isSelected(stock.id) && selectedCount() >= maxSelection()"
                  (change)="toggleStock(stock)"
                  class="w-4 h-4 rounded border-2 text-emerald-500 focus:ring-emerald-500"
                  [class.border-slate-600]="themeService.isDark()"
                  [class.border-gray-300]="themeService.isLight()">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium truncate"
                     [class.text-white]="themeService.isDark()"
                     [class.text-gray-900]="themeService.isLight()">
                    {{ stock.symbol }}
                  </p>
                  <p class="text-xs truncate"
                     [class.text-slate-400]="themeService.isDark()"
                     [class.text-gray-500]="themeService.isLight()">
                    {{ stock.displayName }}
                  </p>
                </div>
                <span class="text-xs px-2 py-0.5 rounded"
                      [class.bg-slate-700]="themeService.isDark()"
                      [class.text-slate-300]="themeService.isDark()"
                      [class.bg-gray-100]="themeService.isLight()"
                      [class.text-gray-600]="themeService.isLight()">
                  #{{ stock.rank }}
                </span>
              </label>
            }
          </div>
          
          <!-- Footer Actions -->
          <div class="px-4 py-3 border-t flex justify-between"
               [class.border-slate-700]="themeService.isDark()"
               [class.border-gray-200]="themeService.isLight()">
            <button
              (click)="clearSelection()"
              class="text-xs font-medium text-red-400 hover:text-red-300 transition">
              {{ lang.t('performance.clearSelection') }}
            </button>
            <button
              (click)="selectTop3()"
              class="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition">
              {{ lang.t('performance.selectTop3') }}
            </button>
          </div>
        </div>
      }
    </div>
    
    <!-- Selected Stocks Pills (Mobile-friendly) -->
    @if (selectedCount() > 0) {
      <div class="flex flex-wrap gap-2 mt-3">
        @for (stock of selectedStocksDetails(); track stock.id) {
          <div class="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
               [style.backgroundColor]="getStockColor(stock.id) + '20'"
               [style.color]="getStockColor(stock.id)">
            <span class="w-2 h-2 rounded-full" [style.backgroundColor]="getStockColor(stock.id)"></span>
            {{ stock.symbol }}
            <button (click)="toggleStock(stock)" class="ml-1 hover:opacity-70">
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        }
      </div>
    }
  `
})
export class CompareStocksSelectorComponent {
  readonly lang = inject(LanguageService);
  readonly themeService = inject(ThemeService);
  
  // Inputs
  stocks = input<Stock[]>([]);
  selected = input<string[]>([]);
  maxSelection = input(5);
  
  // Outputs
  selectionChange = output<string[]>();
  
  // Local state
  isOpen = signal(false);
  
  // Chart colors for stocks
  private readonly colors = [
    '#10b981', // Emerald
    '#3b82f6', // Blue
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#84cc16', // Lime
  ];
  
  // Computed
  selectedCount = computed(() => this.selected().length);
  
  selectedStocksDetails = computed(() => {
    const selectedIds = this.selected();
    return this.stocks().filter(s => selectedIds.includes(s.id));
  });
  
  toggleDropdown(): void {
    this.isOpen.update(v => !v);
  }
  
  closeDropdown(): void {
    this.isOpen.set(false);
  }
  
  isSelected(stockId: string): boolean {
    return this.selected().includes(stockId);
  }
  
  toggleStock(stock: Stock): void {
    const current = [...this.selected()];
    const index = current.indexOf(stock.id);
    
    if (index >= 0) {
      current.splice(index, 1);
    } else if (current.length < this.maxSelection()) {
      current.push(stock.id);
    }
    
    this.selectionChange.emit(current);
  }
  
  clearSelection(): void {
    this.selectionChange.emit([]);
  }
  
  selectTop3(): void {
    const top3 = this.stocks()
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 3)
      .map(s => s.id);
    this.selectionChange.emit(top3);
  }
  
  getStockColor(stockId: string): string {
    const index = this.selected().indexOf(stockId);
    return this.colors[index % this.colors.length];
  }
}
