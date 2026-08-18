import { TestBed } from '@angular/core/testing';
import { DipPrediction } from '../models/plan.model';
import {
  DipSignalService,
  cacheCoversToday,
  dipSignalRetentionCutoff,
  istCalendarDate,
  DipSignalCache,
} from './dip-signal.service';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';
import { SupabaseClientService } from './supabase-client.service';

function prediction(symbols: string[]): DipPrediction {
  return {
    summary: 'test',
    marketTone: 'cautious',
    provider: 'local',
    picks: symbols.map((symbol) => ({
      symbol,
      displayName: symbol,
      score: 40,
      action: 'skip' as const,
      confidence: 'medium' as const,
      dropType: 'correction' as const,
      rationale: 'n/a',
      riskNote: 'n/a',
    })),
  };
}

describe('DipSignalService helpers', () => {
  it('formats the IST calendar date as YYYY-MM-DD', () => {
    // 12:00 IST on 18 Aug = 06:30 UTC
    const date = istCalendarDate(new Date('2026-08-18T06:30:00Z'));
    expect(date).toBe('2026-08-18');
  });

  it('computes the IST cutoff 14 days before today', () => {
    expect(dipSignalRetentionCutoff(14, new Date('2026-08-18T06:30:00Z'))).toBe('2026-08-04');
  });

  it('accepts a same-day cache that covers every requested symbol', () => {
    const cache: DipSignalCache = {
      asOfDate: '2026-08-18',
      scoredAt: '2026-08-18T04:00:00.000Z',
      prediction: prediction(['TCS', 'INFY']),
    };
    expect(cacheCoversToday(cache, ['INFY'], '2026-08-18')).toBe(true);
    expect(cacheCoversToday(cache, ['HAL'], '2026-08-18')).toBe(false);
    expect(cacheCoversToday(cache, ['TCS'], '2026-08-19')).toBe(false);
  });
});

describe('DipSignalService', () => {
  let service: DipSignalService;
  let storage: StorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DipSignalService,
        StorageService,
        { provide: AuthService, useValue: { user: () => ({ id: 'user-1' }) } },
        { provide: SupabaseClientService, useValue: { client: null, isEnabled: false } },
      ],
    });
    service = TestBed.inject(DipSignalService);
    storage = TestBed.inject(StorageService);
  });

  it('returns today\'s cache when every symbol is present', () => {
    const today = istCalendarDate();
    const cache: DipSignalCache = {
      asOfDate: today,
      scoredAt: new Date().toISOString(),
      prediction: prediction(['RELIANCE', 'TCS']),
    };
    storage.set('dh_dip_signals', cache);

    expect(service.readToday(['TCS', 'RELIANCE'])?.prediction.picks).toHaveLength(2);
    expect(service.readToday(['HAL'])).toBeNull();
  });

  it('writes the daily cache to storage', () => {
    service.persist(prediction(['INFY']));
    const stored = storage.get<DipSignalCache>('dh_dip_signals');
    expect(stored?.asOfDate).toBe(istCalendarDate());
    expect(stored?.prediction.picks[0].symbol).toBe('INFY');
  });
});
