import { Pipe, PipeTransform, inject } from '@angular/core';
import { CurrencyCode } from '../../core/models/currency.model';
import { CurrencyService } from '../../core/services/currency.service';

// Impure because it depends on the displayCurrency signal which can change at any time
@Pipe({ name: 'currencyDisplay', standalone: true, pure: false })
export class CurrencyDisplayPipe implements PipeTransform {
  private readonly currencyService = inject(CurrencyService);

  transform(value: number | undefined | null, sourceCurrency: CurrencyCode = 'INR'): string {
    if (value === undefined || value === null || isNaN(value)) return '—';
    const targetCurrency = this.currencyService.displayCurrency();
    const converted = this.currencyService.convert(value, sourceCurrency, targetCurrency);
    return this.currencyService.formatDisplay(converted, targetCurrency);
  }
}
