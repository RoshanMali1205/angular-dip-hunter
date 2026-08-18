/**
 * Today's AI picks inbox (header bell).
 *
 * Hourly popups are a bad fit: scores refresh once per IST day, and the
 * dashboard already shows Signal + Score. This inbox is on-demand, with
 * at most one browser notification per day when BUY names exist.
 */

import { Injectable, computed, inject, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { DipPick } from '../models/plan.model';
import { DipSignalCache, istCalendarDate } from './dip-signal.service';

export interface RecoInboxState {
  seenAsOfDate: string | null;
  notifiedAsOfDate: string | null;
}

export function actionablePicks(cache: DipSignalCache | null, today = istCalendarDate()): DipPick[] {
  if (!cache || cache.asOfDate !== today) return [];
  return [...(cache.prediction.picks ?? [])]
    .filter((p) => p.action === 'buy' || p.action === 'watch')
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

@Injectable({ providedIn: 'root' })
export class RecoInboxService {
  private storage = inject(StorageService);
  private readonly cacheTick = signal(0);
  private readonly stateTick = signal(0);

  constructor() {
    this.storage.persisted$.subscribe(({ key }) => {
      if (key === 'dh_dip_signals') {
        this.cacheTick.update((n) => n + 1);
        this.maybeNotifyOnce();
      }
    });
    this.maybeNotifyOnce();
  }

  readonly cache = computed(() => {
    this.cacheTick();
    return this.storage.get<DipSignalCache>('dh_dip_signals');
  });

  readonly picks = computed(() => actionablePicks(this.cache()));

  readonly buyCount = computed(() => this.picks().filter((p) => p.action === 'buy').length);

  readonly isFresh = computed(() => {
    const cache = this.cache();
    return Boolean(cache && cache.asOfDate === istCalendarDate());
  });

  readonly unreadCount = computed(() => {
    this.stateTick();
    if (this.readState().seenAsOfDate === istCalendarDate()) return 0;
    return this.picks().length;
  });

  markSeen(): void {
    this.writeState({ ...this.readState(), seenAsOfDate: istCalendarDate() });
  }

  maybeNotifyOnce(): void {
    const today = istCalendarDate();
    const picks = actionablePicks(this.storage.get<DipSignalCache>('dh_dip_signals'), today);
    const buys = picks.filter((p) => p.action === 'buy');
    if (buys.length === 0) return;

    const state = this.readState();
    if (state.notifiedAsOfDate === today) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    try {
      const names = buys.map((p) => p.symbol).join(', ');
      new Notification(`Dip Hunter: ${buys.length} buy-zone dip${buys.length === 1 ? '' : 's'} today`, {
        body: names,
        icon: '/icons/icon-192x192.png',
        tag: 'dip-hunter-daily-picks',
      } as NotificationOptions);
      this.writeState({ ...state, notifiedAsOfDate: today });
    } catch {
      // Notifications may be blocked — fail silently
    }
  }

  private readState(): RecoInboxState {
    this.stateTick();
    return (
      this.storage.get<RecoInboxState>('dh_reco_inbox') ?? {
        seenAsOfDate: null,
        notifiedAsOfDate: null,
      }
    );
  }

  private writeState(state: RecoInboxState): void {
    this.storage.set('dh_reco_inbox', state, { localOnly: true });
    this.stateTick.update((n) => n + 1);
  }
}
