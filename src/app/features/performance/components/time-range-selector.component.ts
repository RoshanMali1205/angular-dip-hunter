/**
 * Time Range Selector Component
 * Displays chips/tabs for selecting performance time range
 */

import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoryRange, TIME_RANGE_OPTIONS, TimeRangeOption } from '../../../core/models/performance.model';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-time-range-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-wrap gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
      @for (option of options(); track option.value) {
        <button
          (click)="selectRange(option.value)"
          class="px-2.5 py-1 text-xs font-medium rounded-lg transition-all duration-200 whitespace-nowrap min-w-[36px]"
          [class.bg-emerald-500]="selected() === option.value"
          [class.text-white]="selected() === option.value"
          [class.shadow-lg]="selected() === option.value"
          [class.shadow-emerald-500/30]="selected() === option.value"
          [class.bg-slate-800]="selected() !== option.value && themeService.isDark()"
          [class.text-slate-300]="selected() !== option.value && themeService.isDark()"
          [class.hover:bg-slate-700]="selected() !== option.value && themeService.isDark()"
          [class.bg-gray-100]="selected() !== option.value && themeService.isLight()"
          [class.text-gray-700]="selected() !== option.value && themeService.isLight()"
          [class.hover:bg-gray-200]="selected() !== option.value && themeService.isLight()">
          {{ option.label }}
        </button>
      }
    </div>
  `,
  styles: [`
    .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }
  `]
})
export class TimeRangeSelectorComponent {
  // Inputs
  selected = input<HistoryRange>('30D');
  customOptions = input<TimeRangeOption[] | null>(null);
  
  // Outputs
  rangeChange = output<HistoryRange>();
  
  // Computed
  options = computed(() => this.customOptions() || TIME_RANGE_OPTIONS);
  
  constructor(public themeService: ThemeService) {}
  
  selectRange(range: HistoryRange): void {
    this.rangeChange.emit(range);
  }
}
