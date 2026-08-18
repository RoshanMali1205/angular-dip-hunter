/**
 * Daily AI signal + score cache.
 * localStorage (and user_snapshots via CloudSync) is the working cache;
 * public.dip_signals is the SQL table for the same day's rows.
 */

import { Injectable, inject } from '@angular/core';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';
import { SupabaseClientService } from './supabase-client.service';
import { DipPick, DipPrediction } from '../models/plan.model';

export interface DipSignalCache {
  asOfDate: string;
  scoredAt: string;
  prediction: DipPrediction;
}

export function istCalendarDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function cacheCoversToday(
  cache: DipSignalCache | null | undefined,
  symbols: string[],
  today = istCalendarDate()
): cache is DipSignalCache {
  if (!cache || cache.asOfDate !== today || !cache.prediction?.picks?.length) {
    return false;
  }
  const have = new Set(cache.prediction.picks.map((p) => p.symbol));
  return symbols.every((symbol) => have.has(symbol));
}

@Injectable({ providedIn: 'root' })
export class DipSignalService {
  private storage = inject(StorageService);
  private auth = inject(AuthService);
  private supabase = inject(SupabaseClientService);

  readToday(symbols: string[]): DipSignalCache | null {
    const cache = this.storage.get<DipSignalCache>('dh_dip_signals');
    return cacheCoversToday(cache, symbols) ? cache : null;
  }

  persist(prediction: DipPrediction): void {
    const cache: DipSignalCache = {
      asOfDate: istCalendarDate(),
      scoredAt: new Date().toISOString(),
      prediction,
    };
    this.storage.set('dh_dip_signals', cache);
    void this.upsertRemote(cache);
  }

  private async upsertRemote(cache: DipSignalCache): Promise<void> {
    const client = this.supabase.client;
    const userId = this.auth.user()?.id;
    if (!client || !userId || !this.supabase.isEnabled) return;

    const rows = cache.prediction.picks.map((pick) => this.toRow(userId, cache, pick));
    if (!rows.length) return;

    const { error } = await client.from('dip_signals').upsert(rows, {
      onConflict: 'user_id,symbol,as_of_date',
    });
    if (error) {
      console.warn('[dip-signals] upsert failed:', error.message);
      return;
    }

    await this.touchStockColumns(userId, cache);
  }

  private async touchStockColumns(userId: string, cache: DipSignalCache): Promise<void> {
    const client = this.supabase.client;
    if (!client) return;

    const scoredAt = cache.scoredAt;
    await Promise.all(
      cache.prediction.picks.map(async (pick) => {
        const { error } = await client
          .from('stocks')
          .update({
            ai_signal: pick.action,
            ai_score: Math.round(pick.score),
            ai_scored_at: scoredAt,
          })
          .eq('user_id', userId)
          .eq('symbol', pick.symbol);
        if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
          console.warn('[dip-signals] stocks.ai_* update skipped:', error.message);
        }
      })
    );
  }

  private toRow(userId: string, cache: DipSignalCache, pick: DipPick) {
    return {
      user_id: userId,
      symbol: pick.symbol,
      as_of_date: cache.asOfDate,
      action: pick.action,
      score: Math.round(pick.score),
      rationale: pick.rationale,
      confidence: pick.confidence,
      drop_type: pick.dropType,
      risk_note: pick.riskNote,
      provider: cache.prediction.provider ?? 'local',
      model: cache.prediction.model ?? null,
    };
  }
}
