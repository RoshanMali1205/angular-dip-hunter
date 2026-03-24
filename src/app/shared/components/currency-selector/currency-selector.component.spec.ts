import { TestBed } from '@angular/core/testing';
import { CurrencySelectorComponent } from './currency-selector.component';
import { ThemeService } from '../../../core/services/theme.service';
import { SUPPORTED_CURRENCIES, CurrencyCode } from '../../../core/models/currency.model';

describe('CurrencySelectorComponent', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<CurrencySelectorComponent>>;
  let component: CurrencySelectorComponent;
  const themeMock = {
    isDark: vi.fn().mockReturnValue(true),
    isLight: vi.fn().mockReturnValue(false),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CurrencySelectorComponent],
      providers: [
        { provide: ThemeService, useValue: themeMock },
      ],
    });

    fixture = TestBed.createComponent(CurrencySelectorComponent);
    fixture.componentRef.setInput('selected', 'INR');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('has all supported currencies available', () => {
    expect(component.currencies).toEqual(SUPPORTED_CURRENCIES);
    expect(component.currencies.length).toBe(SUPPORTED_CURRENCIES.length);
  });

  it('renders an option for each supported currency', () => {
    const options = fixture.nativeElement.querySelectorAll('option');
    expect(options.length).toBe(SUPPORTED_CURRENCIES.length);
  });

  it('renders flag, code and name in each option', () => {
    const options: HTMLOptionElement[] = fixture.nativeElement.querySelectorAll('option');

    SUPPORTED_CURRENCIES.forEach((currency, index) => {
      const text = options[index].textContent?.trim() ?? '';
      expect(text).toContain(currency.flag);
      expect(text).toContain(currency.code);
      expect(text).toContain(currency.name);
    });
  });

  it('sets the select value to the selected input', () => {
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    expect(select.value).toContain('INR');
  });

  it('emits currencyChange when a currency is selected', () => {
    const emitSpy = vi.spyOn(component.currencyChange, 'emit');

    component.onCurrencyChange('USD' as CurrencyCode);

    expect(emitSpy).toHaveBeenCalledWith('USD');
  });

  it('exposes the selected input value', () => {
    expect(component.selected()).toBe('INR');

    fixture.componentRef.setInput('selected', 'EUR');
    expect(component.selected()).toBe('EUR');
  });
});
