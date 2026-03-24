import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CurrencyCode, SUPPORTED_CURRENCIES, SupportedCurrency } from '../../../core/models/currency.model';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-currency-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative">
      <select
        aria-label="Select display currency"
        [ngModel]="selected()"
        (ngModelChange)="onCurrencyChange($event)"
        class="w-full rounded-lg border px-3 py-2.5 pr-10 text-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
        [class.bg-slate-800]="themeService.isDark()"
        [class.border-slate-700]="themeService.isDark()"
        [class.text-white]="themeService.isDark()"
        [class.hover:border-slate-600]="themeService.isDark()"
        [class.bg-white]="themeService.isLight()"
        [class.border-gray-300]="themeService.isLight()"
        [class.text-gray-900]="themeService.isLight()"
        [class.hover:border-gray-400]="themeService.isLight()">
        @for (currency of currencies; track currency.code) {
          <option [value]="currency.code">
            {{ currency.flag }} {{ currency.code }} — {{ currency.name }}
          </option>
        }
      </select>
      <svg class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
           [class.text-slate-400]="themeService.isDark()"
           [class.text-gray-400]="themeService.isLight()"
           fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  `
})
export class CurrencySelectorComponent {
  readonly themeService = inject(ThemeService);

  readonly selected = input.required<CurrencyCode>();
  readonly currencyChange = output<CurrencyCode>();

  readonly currencies: SupportedCurrency[] = SUPPORTED_CURRENCIES;

  onCurrencyChange(code: CurrencyCode): void {
    this.currencyChange.emit(code);
  }
}
