import { TestBed } from '@angular/core/testing';
import { DipPrediction } from '../models/plan.model';
import { DipSignalCache, istCalendarDate } from './dip-signal.service';
import { RecoInboxService, actionablePicks } from './reco-inbox.service';
import { StorageService } from './storage.service';

function prediction(rows: Array<{ symbol: string; action: 'buy' | 'watch' | 'skip'; score: number }>): DipPrediction {
  return {
    summary: 'test',
    marketTone: 'cautious',
    provider: 'local',
    picks: rows.map((row) => ({
      symbol: row.symbol,
      displayName: row.symbol,
      score: row.score,
      action: row.action,
      confidence: 'medium',
      dropType: 'correction',
      rationale: 'n/a',
      riskNote: 'n/a',
    })),
  };
}

describe('actionablePicks', () => {
  it('keeps only today\'s buy and watch names, ranked by score', () => {
    const cache: DipSignalCache = {
      asOfDate: '2026-08-18',
      scoredAt: '2026-08-18T04:00:00.000Z',
      prediction: prediction([
        { symbol: 'TCS', action: 'skip', score: 20 },
        { symbol: 'INFY', action: 'buy', score: 82 },
        { symbol: 'HDFCBANK', action: 'watch', score: 55 },
        { symbol: 'RELIANCE', action: 'buy', score: 70 },
      ]),
    };

    const picks = actionablePicks(cache, '2026-08-18');
    expect(picks.map((p) => p.symbol)).toEqual(['INFY', 'RELIANCE', 'HDFCBANK']);
  });

  it('ignores yesterday\'s cache', () => {
    const cache: DipSignalCache = {
      asOfDate: '2026-08-17',
      scoredAt: '2026-08-17T04:00:00.000Z',
      prediction: prediction([{ symbol: 'INFY', action: 'buy', score: 82 }]),
    };
    expect(actionablePicks(cache, '2026-08-18')).toEqual([]);
  });
});

describe('RecoInboxService', () => {
  let service: RecoInboxService;
  let storage: StorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RecoInboxService, StorageService],
    });
    storage = TestBed.inject(StorageService);
    storage.remove('dh_dip_signals');
    storage.remove('dh_reco_inbox');
    service = TestBed.inject(RecoInboxService);
  });

  it('counts unread picks until the panel is opened today', () => {
    const today = istCalendarDate();
    storage.set('dh_dip_signals', {
      asOfDate: today,
      scoredAt: new Date().toISOString(),
      prediction: prediction([
        { symbol: 'INFY', action: 'buy', score: 80 },
        { symbol: 'TCS', action: 'skip', score: 20 },
      ]),
    });

    expect(service.unreadCount()).toBe(1);
    service.markSeen();
    expect(service.unreadCount()).toBe(0);
  });
});
