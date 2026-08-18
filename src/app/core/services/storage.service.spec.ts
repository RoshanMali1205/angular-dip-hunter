import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
      (key: string) => store[key] ?? null
    );
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
      (key: string, value: string) => { store[key] = value; }
    );
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(
      (key: string) => { delete store[key]; }
    );

    TestBed.configureTestingModule({});
    service = TestBed.inject(StorageService);
  });

  afterEach(() => vi.restoreAllMocks());

  describe('set()', () => {
    it('serialises the value as JSON and returns true', () => {
      const result = service.set('dh_folders', [{ id: '1', name: 'Tech' }]);

      expect(result).toBe(true);
      expect(store['dh_folders']).toBe(JSON.stringify([{ id: '1', name: 'Tech' }]));
    });

    it('returns false and logs error when localStorage throws', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = service.set('dh_folders', []);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('get()', () => {
    it('returns parsed value when key exists', () => {
      store['dh_stocks'] = JSON.stringify([{ ticker: 'AAPL' }]);

      const result = service.get<{ ticker: string }[]>('dh_stocks');

      expect(result).toEqual([{ ticker: 'AAPL' }]);
    });

    it('returns null when key does not exist', () => {
      const result = service.get('dh_folders');

      expect(result).toBeNull();
    });

    it('returns null and logs error when stored value is malformed JSON', () => {
      store['dh_folders'] = '{invalid-json';
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = service.get('dh_folders');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('remove()', () => {
    it('deletes the key from localStorage', () => {
      store['dh_plans'] = '"some-data"';

      service.remove('dh_plans');

      expect(localStorage.removeItem).toHaveBeenCalledWith('dh_plans');
      expect(store['dh_plans']).toBeUndefined();
    });
  });

  describe('clearAll()', () => {
    it('removes all predefined app keys', () => {
      service.clearAll();

      const clearedKeys = [
        'dh_folders',
        'dh_stocks',
        'dh_plans',
        'dh_transactions',
        'dh_settings',
        'dh_quote_cache',
        'dh_dip_signals',
      ];
      clearedKeys.forEach(key =>
        expect(localStorage.removeItem).toHaveBeenCalledWith(key)
      );
    });
  });

  describe('exportAll()', () => {
    it('returns an object with all domain keys', () => {
      store['dh_folders'] = JSON.stringify([{ id: 'f1' }]);
      store['dh_stocks'] = JSON.stringify([{ ticker: 'MSFT' }]);

      const exported = service.exportAll();

      expect(exported['folders']).toEqual([{ id: 'f1' }]);
      expect(exported['stocks']).toEqual([{ ticker: 'MSFT' }]);
    });
  });
});
