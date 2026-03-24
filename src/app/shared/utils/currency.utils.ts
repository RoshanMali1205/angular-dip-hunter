import { CurrencyCode, SUPPORTED_CURRENCIES } from '../../core/models/currency.model';

export function getCurrencySymbol(code: CurrencyCode): string {
  return SUPPORTED_CURRENCIES.find(c => c.code === code)?.symbol ?? code;
}

export function getLocaleForCurrency(code: CurrencyCode): string {
  return SUPPORTED_CURRENCIES.find(c => c.code === code)?.locale ?? 'en-US';
}

export function formatCurrencyValue(amount: number, code: CurrencyCode): string {
  const locale = getLocaleForCurrency(code);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    minimumFractionDigits: code === 'JPY' ? 0 : 2,
    maximumFractionDigits: code === 'JPY' ? 0 : 2,
  }).format(amount);
}

export function convertAmount(amount: number, fromRate: number, toRate: number): number {
  if (fromRate === 0) return amount;
  if (toRate === 0) return amount;
  return (amount / fromRate) * toRate;
}
