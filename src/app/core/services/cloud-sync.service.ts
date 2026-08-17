/**
 * Per-user cloud snapshot sync (Supabase user_snapshots).
 * Pulls into localStorage before feature services construct (APP_INITIALIZER).
 * Pushes after StorageService writes to cloud keys.
 */

import { Injectable, inject } from '@angular/core';
import { StorageKey, StorageService } from './storage.service';
import { AuthService } from './auth.service';
import { SupabaseClientService } from './supabase-client.service';

const CLOUD_KEYS: StorageKey[] = [
  'dh_folders',
  'dh_stocks',
  'dh_plans',
  'dh_transactions',
  'dh_drafts',
  'dh_settings',
  'dh_user',
];

@Injectable({ providedIn: 'root' })
export class CloudSyncService {
  private storage = inject(StorageService);
  private auth = inject(AuthService);
  private supabase = inject(SupabaseClientService);
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pulling = false;

  constructor() {
    this.storage.persisted$.subscribe(({ key }) => {
      if (!CLOUD_KEYS.includes(key) || this.pulling) return;
      this.schedulePush();
    });
  }

  async pull(): Promise<void> {
    const client = this.supabase.client;
    const userId = this.auth.user()?.id;
    if (!client || !userId) return;

    this.pulling = true;
    try {
      const { data, error } = await client
        .from('user_snapshots')
        .select('payload')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) {
        console.warn('[cloud-sync] pull failed:', error.message);
        return;
      }
      const payload = (data?.payload ?? {}) as Record<string, unknown>;
      for (const key of CLOUD_KEYS) {
        if (payload[key] !== undefined) {
          this.storage.set(key as StorageKey, payload[key], { localOnly: true });
        }
      }
    } finally {
      this.pulling = false;
    }
  }

  private schedulePush(): void {
    if (!this.supabase.isEnabled || !this.auth.isAuthenticated()) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      void this.push();
    }, 800);
  }

  async push(): Promise<void> {
    const client = this.supabase.client;
    const userId = this.auth.user()?.id;
    if (!client || !userId) return;

    const payload: Record<string, unknown> = { version: 1 };
    for (const key of CLOUD_KEYS) {
      payload[key] = this.storage.get(key);
    }

    const { error } = await client.from('user_snapshots').upsert(
      { user_id: userId, payload, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
    if (error) {
      console.warn('[cloud-sync] push failed:', error.message);
    }
  }
}
