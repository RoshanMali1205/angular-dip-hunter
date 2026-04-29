import { TestBed } from '@angular/core/testing';
import { WhatsNewService } from './whats-new.service';
import { WhatsNewRelease } from '../config/app-release.config';

describe('WhatsNewService', () => {
  let service: WhatsNewService;
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
      (key: string) => store[key] ?? null
    );
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
      (key: string, value: string) => {
        store[key] = value;
      }
    );

    TestBed.configureTestingModule({ providers: [WhatsNewService] });
    service = TestBed.inject(WhatsNewService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('shouldShowWhatsNew()', () => {
    it('returns false when no last seen version is stored', () => {
      expect(service.shouldShowWhatsNew()).toBe(false);
    });

    it('returns false when last seen version matches current app version', () => {
      store[service.storageKey] = service.appVersion;

      expect(service.shouldShowWhatsNew()).toBe(false);
    });

    it('returns true when last seen version differs from app version', () => {
      store[service.storageKey] = '0.9.0';

      expect(service.shouldShowWhatsNew()).toBe(true);
    });
  });

  describe('markAsSeen()', () => {
    it('persists current app version as last seen', () => {
      service.markAsSeen();

      expect(localStorage.setItem).toHaveBeenCalledWith(service.storageKey, service.appVersion);
      expect(store[service.storageKey]).toBe(service.appVersion);
    });
  });

  describe('seedCurrentVersionIfMissing()', () => {
    it('seeds current version when no key exists', () => {
      expect(service.seedCurrentVersionIfMissing()).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledWith(service.storageKey, service.appVersion);
      expect(store[service.storageKey]).toBe(service.appVersion);
    });

    it('does not overwrite existing stored version', () => {
      store[service.storageKey] = '0.9.0';

      expect(service.seedCurrentVersionIfMissing()).toBe(false);
      expect(store[service.storageKey]).toBe('0.9.0');
    });
  });

  describe('getLatestRelease()', () => {
    it('returns null when there are no releases', () => {
      (service as unknown as { releases: WhatsNewRelease[] }).releases = [];

      expect(service.getLatestRelease()).toBeNull();
    });

    it('returns the release matching appVersion when present', () => {
      const matching: WhatsNewRelease = {
        version: '2.0.0',
        date: '2026-04-29',
        highlights: [{ icon: 'spark', tag: 'new', textKey: 'k1' }],
      };
      const fallback: WhatsNewRelease = {
        version: '1.9.0',
        date: '2026-04-28',
        highlights: [{ icon: 'rocket', tag: 'improved', textKey: 'k2' }],
      };

      (service as unknown as { appVersion: string }).appVersion = '2.0.0';
      (service as unknown as { releases: WhatsNewRelease[] }).releases = [fallback, matching];

      expect(service.getLatestRelease()).toEqual(matching);
    });

    it('returns first release as fallback when no version matches appVersion', () => {
      const first: WhatsNewRelease = {
        version: '3.0.0',
        date: '2026-04-30',
        highlights: [{ icon: 'shield', tag: 'fix', textKey: 'k3' }],
      };
      const second: WhatsNewRelease = {
        version: '2.5.0',
        date: '2026-04-29',
        highlights: [{ icon: 'spark', tag: 'new', textKey: 'k4' }],
      };

      (service as unknown as { appVersion: string }).appVersion = '9.9.9';
      (service as unknown as { releases: WhatsNewRelease[] }).releases = [first, second];

      expect(service.getLatestRelease()).toEqual(first);
    });
  });
});
