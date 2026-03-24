import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { CurrencyService } from './currency.service';
import { StorageService } from './storage.service';
import { SettingsService } from './settings.service';
import { CurrencyCode, ExchangeRateCache } from '../models/currency.model';

function makeStorageMock(cached: ExchangeRateCache | null = null) {
  return {
    get: vi.fn().mockReturnValue(cached),
    set: vi.fn().mockReturnValue(true),
  };
}

function makeSettingsMock(currency: CurrencyCode = 'INR') {
  const _currency = signal<CurrencyCode>(currency);
  return {
    displayCurrency: _currency.asReadonly(),
    _setCurrency: (c: CurrencyCode) => _currency.set(c),
  };
}

function makeValidCache(
  base: CurrencyCode = 'INR',
  rates: Record<string, number> = { USD: 0.012, EUR: 0.011, JPY: 1.8 },
): ExchangeRateCache {
  const now = new Date();
  return {
    base,
    rates: { [base]: 1, ...rates },
    fetchedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString(),
  };
}

function makeExpiredCache(
  base: CurrencyCode = 'INR',
  rates: Record<string, number> = { USD: 0.012, EUR: 0.011 },
): ExchangeRateCache {
  return {
    base,
    rates: { [base]: 1, ...rates },
    fetchedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() - 1000).toISOString(),
  };
}

const API_URL = 'https://api.frankfurter.dev/latest?from=INR';

describe('CurrencyService', () => {
  describe('without cached rates', () => {
    let service: CurrencyService;
    let httpMock: HttpTestingController;
    let storageMock: ReturnType<typeof makeStorageMock>;
    let settingsMock: ReturnType<typeof makeSettingsMock>;

    beforeEach(() => {
      storageMock = makeStorageMock(null);
      settingsMock = makeSettingsMock('INR');

      TestBed.configureTestingModule({
        providers: [
          CurrencyService,
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: StorageService, useValue: storageMock },
          { provide: SettingsService, useValue: settingsMock },
        ],
      });

      httpMock = TestBed.inject(HttpTestingController);
      service = TestBed.inject(CurrencyService);
      TestBed.flushEffects();
    });

    afterEach(() => httpMock.verify());

    describe('fetchRates()', () => {
      it('makes HTTP call to Frankfurter API with the given base', () => {
        service.fetchRates('INR');

        const req = httpMock.expectOne(API_URL);
        expect(req.request.method).toBe('GET');
        req.flush({ base: 'INR', rates: { USD: 0.012, EUR: 0.011 } });
      });

      it('sets rates, lastFetched and caches the response', () => {
        service.fetchRates('INR');
        const req = httpMock.expectOne(API_URL);
        req.flush({ base: 'INR', rates: { USD: 0.012, EUR: 0.011 } });

        const rates = service.rates();
        expect(rates['USD']).toBe(0.012);
        expect(rates['EUR']).toBe(0.011);
        expect(rates['INR']).toBe(1);
        expect(service.lastFetched()).toBeTruthy();
        expect(storageMock.set).toHaveBeenCalledWith(
          'dh_exchange_rates',
          expect.objectContaining({ base: 'INR' }),
        );
      });

      it('sets isLoading to true during request and false after', () => {
        service.fetchRates();
        expect(service.isLoading()).toBe(true);

        const req = httpMock.expectOne(API_URL);
        req.flush({ base: 'INR', rates: { USD: 0.012 } });

        expect(service.isLoading()).toBe(false);
      });

      it('encodes the base currency in the URL', () => {
        service.fetchRates('USD');

        const req = httpMock.expectOne('https://api.frankfurter.dev/latest?from=USD');
        req.flush({ base: 'USD', rates: { INR: 83, EUR: 0.92 } });
      });
    });

    describe('error handling', () => {
      it('sets isLoading to false on HTTP error', () => {
        service.fetchRates();
        const req = httpMock.expectOne(API_URL);
        req.error(new ProgressEvent('error'));

        expect(service.isLoading()).toBe(false);
      });
    });

    describe('convert()', () => {
      it('returns same amount when from and to are identical', () => {
        expect(service.convert(1000, 'INR', 'INR')).toBe(1000);
      });

      it('returns original amount when no rates are loaded', () => {
        expect(service.convert(1000, 'INR', 'USD')).toBe(1000);
      });
    });

    describe('formatDisplay()', () => {
      it('formats amount with default display currency', () => {
        const result = service.formatDisplay(1234.56);
        expect(result).toContain('1,234.56');
      });

      it('formats amount with explicit currency code', () => {
        const result = service.formatDisplay(1234.56, 'USD');
        expect(result).toContain('$');
        expect(result).toContain('1,234.56');
      });

      it('formats JPY with no decimals', () => {
        const result = service.formatDisplay(1234.56, 'JPY');
        expect(result).not.toMatch(/\.\d/);
      });
    });

    describe('displayCurrency signal', () => {
      it('reflects the settings service display currency', () => {
        expect(service.displayCurrency()).toBe('INR');
      });

      it('updates when settings currency changes', () => {
        settingsMock._setCurrency('GBP');
        expect(service.displayCurrency()).toBe('GBP');
      });
    });

    describe('currencySymbol computed', () => {
      it('returns ₹ when display currency is INR', () => {
        expect(service.currencySymbol()).toBe('₹');
      });

      it('updates when display currency changes', () => {
        settingsMock._setCurrency('EUR');
        expect(service.currencySymbol()).toBe('€');
      });
    });

    describe('auto-fetch effect', () => {
      it('fetches rates when currency changes to non-INR and rates are empty', () => {
        settingsMock._setCurrency('USD');
        TestBed.flushEffects();

        const req = httpMock.expectOne(API_URL);
        req.flush({ base: 'INR', rates: { USD: 0.012 } });
      });

      it('does not fetch when currency stays INR', () => {
        settingsMock._setCurrency('INR');
        TestBed.flushEffects();
        // No HTTP call → verified by afterEach
      });
    });
  });

  describe('with valid cached rates', () => {
    let service: CurrencyService;
    let httpMock: HttpTestingController;
    let settingsMock: ReturnType<typeof makeSettingsMock>;
    const cache = makeValidCache('INR', { USD: 0.012, EUR: 0.011, JPY: 1.8 });

    beforeEach(() => {
      settingsMock = makeSettingsMock('INR');

      TestBed.configureTestingModule({
        providers: [
          CurrencyService,
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: StorageService, useValue: makeStorageMock(cache) },
          { provide: SettingsService, useValue: settingsMock },
        ],
      });

      httpMock = TestBed.inject(HttpTestingController);
      service = TestBed.inject(CurrencyService);
      TestBed.flushEffects();
    });

    afterEach(() => httpMock.verify());

    it('loads rates from valid cache without making an HTTP call', () => {
      expect(service.rates()['USD']).toBe(0.012);
      expect(service.rates()['EUR']).toBe(0.011);
      expect(service.lastFetched()).toBe(cache.fetchedAt);
    });

    it('converts using loaded rates', () => {
      // 1000 INR → USD: (1000 / 1) * 0.012 = 12
      expect(service.convert(1000, 'INR', 'USD')).toBeCloseTo(12);
    });

    it('converts between two non-base currencies', () => {
      // 100 USD → EUR: (100 / 0.012) * 0.011 ≈ 91.667
      expect(service.convert(100, 'USD', 'EUR')).toBeCloseTo(91.667, 1);
    });

    it('handles zero amount in conversion', () => {
      expect(service.convert(0, 'INR', 'USD')).toBe(0);
    });

    it('handles negative amount in conversion', () => {
      expect(service.convert(-100, 'INR', 'USD')).toBeCloseTo(-1.2);
    });

    it('returns $ symbol when display currency is USD', () => {
      settingsMock._setCurrency('USD');
      expect(service.currencySymbol()).toBe('$');
    });

    it('preserves cached rates when fetchRates fails', () => {
      expect(service.rates()['USD']).toBe(0.012);

      service.fetchRates();
      const req = httpMock.expectOne(API_URL);
      req.error(new ProgressEvent('error'));

      expect(service.rates()['USD']).toBe(0.012);
    });

    it('does not auto-fetch when rates are already loaded', () => {
      settingsMock._setCurrency('USD');
      TestBed.flushEffects();
      // Rates already populated → no HTTP call → verified by afterEach
    });
  });

  describe('with expired cached rates', () => {
    let service: CurrencyService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
      const expired = makeExpiredCache('INR', { USD: 0.010 });

      TestBed.configureTestingModule({
        providers: [
          CurrencyService,
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: StorageService, useValue: makeStorageMock(expired) },
          { provide: SettingsService, useValue: makeSettingsMock('INR') },
        ],
      });

      httpMock = TestBed.inject(HttpTestingController);
      service = TestBed.inject(CurrencyService);
      TestBed.flushEffects();
    });

    afterEach(() => httpMock.verify());

    it('loads old rates and triggers a refresh', () => {
      // Expired cache still loads old rates
      expect(service.rates()['USD']).toBe(0.010);

      // Constructor triggered fetchRates for expired cache
      const req = httpMock.expectOne(API_URL);
      req.flush({ base: 'INR', rates: { USD: 0.012 } });

      expect(service.rates()['USD']).toBe(0.012);
    });
  });
});
