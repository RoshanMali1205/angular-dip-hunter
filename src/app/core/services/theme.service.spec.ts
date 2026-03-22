import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

function mockMatchMedia(prefersLight: boolean): void {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    matches: prefersLight,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe('ThemeService', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
      (key: string) => store[key] ?? null
    );
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
      (key: string, value: string) => { store[key] = value; }
    );

    // Default: no system preference for light mode
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    // Clean up any classes added to documentElement
    document.documentElement.classList.remove('dark', 'light');
  });

  function createService(): ThemeService {
    TestBed.configureTestingModule({ providers: [ThemeService] });
    const service = TestBed.inject(ThemeService);
    TestBed.flushEffects();
    return service;
  }

  describe('initialisation', () => {
    it('defaults to dark when no stored theme and no system preference', () => {
      const service = createService();

      expect(service.theme()).toBe('dark');
    });

    it('restores stored dark theme from localStorage', () => {
      store['dh_theme'] = 'dark';

      const service = createService();

      expect(service.theme()).toBe('dark');
    });

    it('restores stored light theme from localStorage', () => {
      store['dh_theme'] = 'light';

      const service = createService();

      expect(service.theme()).toBe('light');
    });

    it('falls back to light when system preference is light and no stored theme', () => {
      mockMatchMedia(true);

      const service = createService();

      expect(service.theme()).toBe('light');
    });
  });

  describe('toggleTheme()', () => {
    it('switches from dark to light', () => {
      const service = createService();
      service.setTheme('dark');
      TestBed.flushEffects();

      service.toggleTheme();
      TestBed.flushEffects();

      expect(service.theme()).toBe('light');
    });

    it('switches from light to dark', () => {
      store['dh_theme'] = 'light';
      const service = createService();

      service.toggleTheme();
      TestBed.flushEffects();

      expect(service.theme()).toBe('dark');
    });
  });

  describe('setTheme()', () => {
    it('sets theme to the provided value', () => {
      const service = createService();

      service.setTheme('light');
      TestBed.flushEffects();

      expect(service.theme()).toBe('light');
    });
  });

  describe('isDark() / isLight()', () => {
    it('isDark() returns true when theme is dark', () => {
      const service = createService();
      service.setTheme('dark');
      TestBed.flushEffects();

      expect(service.isDark()).toBe(true);
      expect(service.isLight()).toBe(false);
    });

    it('isLight() returns true when theme is light', () => {
      const service = createService();
      service.setTheme('light');
      TestBed.flushEffects();

      expect(service.isLight()).toBe(true);
      expect(service.isDark()).toBe(false);
    });
  });

  describe('side effects', () => {
    it('persists the current theme to localStorage on each change', () => {
      const service = createService();

      service.setTheme('light');
      TestBed.flushEffects();

      expect(store['dh_theme']).toBe('light');
    });

    it('adds "dark" class to <html> when theme is dark', () => {
      const service = createService();
      service.setTheme('dark');
      TestBed.flushEffects();

      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
    });

    it('adds "light" class to <html> when theme is light', () => {
      const service = createService();
      service.setTheme('light');
      TestBed.flushEffects();

      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });
});
