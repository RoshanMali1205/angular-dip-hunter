import { getCurrencySymbol, getLocaleForCurrency, formatCurrencyValue, convertAmount } from './currency.utils';

describe('Currency Utils', () => {
  describe('getCurrencySymbol()', () => {
    it('returns ₹ for INR', () => {
      expect(getCurrencySymbol('INR')).toBe('₹');
    });

    it('returns $ for USD', () => {
      expect(getCurrencySymbol('USD')).toBe('$');
    });

    it('returns € for EUR', () => {
      expect(getCurrencySymbol('EUR')).toBe('€');
    });

    it('returns £ for GBP', () => {
      expect(getCurrencySymbol('GBP')).toBe('£');
    });

    it('returns ¥ for JPY', () => {
      expect(getCurrencySymbol('JPY')).toBe('¥');
    });

    it('returns A$ for AUD', () => {
      expect(getCurrencySymbol('AUD')).toBe('A$');
    });

    it('returns CHF for CHF', () => {
      expect(getCurrencySymbol('CHF')).toBe('CHF');
    });
  });

  describe('getLocaleForCurrency()', () => {
    it('returns en-IN for INR', () => {
      expect(getLocaleForCurrency('INR')).toBe('en-IN');
    });

    it('returns en-US for USD', () => {
      expect(getLocaleForCurrency('USD')).toBe('en-US');
    });

    it('returns ja-JP for JPY', () => {
      expect(getLocaleForCurrency('JPY')).toBe('ja-JP');
    });

    it('returns de-DE for EUR', () => {
      expect(getLocaleForCurrency('EUR')).toBe('de-DE');
    });

    it('returns en-GB for GBP', () => {
      expect(getLocaleForCurrency('GBP')).toBe('en-GB');
    });

    it('returns de-CH for CHF', () => {
      expect(getLocaleForCurrency('CHF')).toBe('de-CH');
    });
  });

  describe('formatCurrencyValue()', () => {
    it('formats INR with rupee symbol and 2 decimal places', () => {
      const result = formatCurrencyValue(1234.56, 'INR');
      expect(result).toContain('1,234.56');
    });

    it('formats USD with dollar sign and 2 decimal places', () => {
      const result = formatCurrencyValue(1234.56, 'USD');
      expect(result).toContain('1,234.56');
      expect(result).toContain('$');
    });

    it('formats JPY with 0 decimal places', () => {
      const result = formatCurrencyValue(1234.56, 'JPY');
      // JPY rounds to whole yen
      expect(result).not.toMatch(/\.\d/);
    });

    it('formats zero correctly', () => {
      const result = formatCurrencyValue(0, 'USD');
      expect(result).toContain('0.00');
    });

    it('formats negative values', () => {
      const result = formatCurrencyValue(-50.5, 'USD');
      expect(result).toContain('50.50');
    });

    it('formats EUR using de-DE locale', () => {
      const result = formatCurrencyValue(1000, 'EUR');
      expect(result).toContain('€');
    });
  });

  describe('convertAmount()', () => {
    it('converts amount from one rate to another', () => {
      // (100 / 1) * 0.012 = 1.2
      expect(convertAmount(100, 1, 0.012)).toBeCloseTo(1.2);
    });

    it('returns original amount when fromRate is 0', () => {
      expect(convertAmount(100, 0, 0.5)).toBe(100);
    });

    it('returns same amount when rates are equal', () => {
      expect(convertAmount(100, 1, 1)).toBe(100);
    });

    it('handles zero amount', () => {
      expect(convertAmount(0, 1, 0.5)).toBe(0);
    });

    it('handles negative amount', () => {
      expect(convertAmount(-100, 1, 2)).toBe(-200);
    });

    it('handles fractional rates', () => {
      // (500 / 0.25) * 0.5 = 1000
      expect(convertAmount(500, 0.25, 0.5)).toBeCloseTo(1000);
    });
  });
});
