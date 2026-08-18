/**
 * Dip Hunter Supabase browser client.
 * Empty URL/anon key keeps mock local auth (tests and offline demos).
 * On production hosts, keys can also come from GET /.netlify/functions/public-config
 * (Netlify env SUPABASE_URL + SUPABASE_ANON_KEY) so the backend can be enabled
 * without baking secrets into the git repo.
 */

import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

export interface PublicSupabaseConfig {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  configured?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SupabaseClientService {
  private _url = (environment.supabaseUrl || '').trim();
  private _anonKey = (environment.supabaseAnonKey || '').trim();
  private _client: SupabaseClient | null = null;
  private readonly readyPromise: Promise<void>;

  constructor() {
    this.readyPromise = this.init();
  }

  get url(): string {
    return this._url;
  }

  get anonKey(): string {
    return this._anonKey;
  }

  get isEnabled(): boolean {
    return Boolean(this._url && this._anonKey && this._client);
  }

  get client(): SupabaseClient | null {
    return this._client;
  }

  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  private async init(): Promise<void> {
    if (!this._url || !this._anonKey) {
      const remote = await this.loadRemoteConfig();
      if (remote?.supabaseUrl && remote?.supabaseAnonKey) {
        this._url = String(remote.supabaseUrl).trim();
        this._anonKey = String(remote.supabaseAnonKey).trim();
      }
    }
    this._client =
      this._url && this._anonKey
        ? createClient(this._url, this._anonKey, {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true,
              flowType: 'pkce',
            },
          })
        : null;
  }

  private async loadRemoteConfig(): Promise<PublicSupabaseConfig | null> {
    if (!this.shouldLoadRemoteConfig()) return null;
    try {
      const response = await fetch('/.netlify/functions/public-config', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return null;
      return (await response.json()) as PublicSupabaseConfig;
    } catch {
      return null;
    }
  }

  private shouldLoadRemoteConfig(): boolean {
    try {
      const host = globalThis.location?.hostname ?? '';
      return host !== '' && host !== 'localhost' && host !== '127.0.0.1' && host !== '[::1]';
    } catch {
      return false;
    }
  }
}
