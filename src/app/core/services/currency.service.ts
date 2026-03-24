import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CurrencyCode, ExchangeRateCache, SUPPORTED_CURRENCIES } from '../models/currency.model';
import { StorageService } from './storage.service';
import { SettingsService } from './settings.service';
import { formatCurrencyValue, getCurrencySymbol, convertAmount } from '../../shared/utils/currency.utils';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

@Injectable({
  providedIn: 'root'
})
export class CurrencyService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);
  private readonly settingsService = inject(SettingsService);

  readonly displayCurrency = computed(() => this.settingsService.displayCurrency());

  private readonly _rates = signal<Record<string, number>>({});
  readonly rates = this._rates.asReadonly();

  private readonly _isLoading = signal(false);
  readonly isLoading = this._isLoading.asReadonly();

  private readonly _lastFetched = signal<string | null>(null);
  readonly lastFetched = this._lastFetched.asReadonly();

  readonly currencySymbol = computed(() => getCurrencySymbol(this.displayCurrency()));

  private currentBase: CurrencyCode = 'INR';

  constructor() {
    this.loadCachedRates();

    // Auto-fetch rates when display currency changes
    effect(() => {
      const currency = this.displayCurrency();
      if (currency !== 'INR' && Object.keys(this._rates()).length === 0 && !this._isLoading()) {
        this.fetchRates();
      }
    });
  }

  private loadCachedRates(): void {
    const cached = this.storage.get<ExchangeRateCache>('dh_exchange_rates');
    if (cached) {
      this._rates.set(cached.rates);
      this._lastFetched.set(cached.fetchedAt);
      this.currentBase = cached.base;

      // Check if expired
      const expiresAt = new Date(cached.expiresAt).getTime();
      if (Date.now() > expiresAt) {
        this.fetchRates(cached.base);
      }
    }
  }

  fetchRates(base: CurrencyCode = 'INR'): void {
    this._isLoading.set(true);
    this.http.get<{ base: string; rates: Record<string, number> }>(
      `https://api.frankfurter.dev/latest?from=${encodeURIComponent(base)}`
    ).subscribe({
      next: (response) => {
        const rates: Record<string, number> = { ...response.rates, [base]: 1 };
        this._rates.set(rates);
        this.currentBase = base;

        const now = new Date();
        const fetchedAt = now.toISOString();
        const expiresAt = new Date(now.getTime() + CACHE_TTL_MS).toISOString();
        this._lastFetched.set(fetchedAt);

        const cache: ExchangeRateCache = { base, rates, fetchedAt, expiresAt };
        this.storage.set('dh_exchange_rates', cache);
        this._isLoading.set(false);
      },
      error: (err) => {
        console.warn('Failed to fetch exchange rates:', err);
        // Graceful fallback: keep last cached rates or default INR-only
        this._isLoading.set(false);
      }
    });
  }

  convert(amount: number, from: CurrencyCode, to: CurrencyCode): number {
    if (from === to) return amount;
    const rates = this._rates();
    if (!rates || Object.keys(rates).length === 0) return amount;

    const fromRate = from === this.currentBase ? 1 : (rates[from] ?? 1);
    const toRate = to === this.currentBase ? 1 : (rates[to] ?? 1);
    return convertAmount(amount, fromRate, toRate);
  }

  formatDisplay(amount: number, currencyCode?: CurrencyCode): string {
    const code = currencyCode ?? this.displayCurrency();
    return formatCurrencyValue(amount, code);
  }
}
