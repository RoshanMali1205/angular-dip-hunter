import { TestBed } from '@angular/core/testing';
import { CurrencyDisplayPipe } from './currency-display.pipe';
import { CurrencyService } from '../../core/services/currency.service';
import { CurrencyCode } from '../../core/models/currency.model';

function makeCurrencyServiceMock(displayCurrency: CurrencyCode = 'USD') {
  return {
    displayCurrency: vi.fn().mockReturnValue(displayCurrency),
    convert: vi.fn().mockImplementation((val: number, _from: CurrencyCode, _to: CurrencyCode) => val),
    formatDisplay: vi.fn().mockImplementation((val: number, code: CurrencyCode) => `${code} ${val.toFixed(2)}`),
  };
}

describe('CurrencyDisplayPipe', () => {
  let pipe: CurrencyDisplayPipe;
  let currencyService: ReturnType<typeof makeCurrencyServiceMock>;

  beforeEach(() => {
    currencyService = makeCurrencyServiceMock('USD');

    TestBed.configureTestingModule({
      providers: [
        CurrencyDisplayPipe,
        { provide: CurrencyService, useValue: currencyService },
      ],
    });

    pipe = TestBed.inject(CurrencyDisplayPipe);
  });

  it('returns "—" for null input', () => {
    expect(pipe.transform(null)).toBe('—');
  });

  it('returns "—" for undefined input', () => {
    expect(pipe.transform(undefined)).toBe('—');
  });

  it('returns "—" for NaN input', () => {
    expect(pipe.transform(NaN)).toBe('—');
  });

  it('calls convert and formatDisplay for valid number', () => {
    const result = pipe.transform(100);

    expect(currencyService.convert).toHaveBeenCalledWith(100, 'INR', 'USD');
    expect(currencyService.formatDisplay).toHaveBeenCalledWith(100, 'USD');
    expect(result).toBe('USD 100.00');
  });

  it('uses default sourceCurrency of INR when not specified', () => {
    pipe.transform(50);

    expect(currencyService.convert).toHaveBeenCalledWith(50, 'INR', 'USD');
  });

  it('passes explicit sourceCurrency to convert', () => {
    pipe.transform(200, 'EUR');

    expect(currencyService.convert).toHaveBeenCalledWith(200, 'EUR', 'USD');
  });

  it('passes converted value to formatDisplay', () => {
    currencyService.convert.mockReturnValue(12.5);

    pipe.transform(1000, 'INR');

    expect(currencyService.formatDisplay).toHaveBeenCalledWith(12.5, 'USD');
  });

  it('works with different display currencies', () => {
    currencyService.displayCurrency.mockReturnValue('GBP');
    currencyService.convert.mockReturnValue(8.3);
    currencyService.formatDisplay.mockReturnValue('£8.30');

    const result = pipe.transform(100, 'USD');

    expect(currencyService.convert).toHaveBeenCalledWith(100, 'USD', 'GBP');
    expect(result).toBe('£8.30');
  });

  it('does not call convert or formatDisplay for invalid input', () => {
    pipe.transform(null);
    pipe.transform(undefined);
    pipe.transform(NaN);

    expect(currencyService.convert).not.toHaveBeenCalled();
    expect(currencyService.formatDisplay).not.toHaveBeenCalled();
  });
});
