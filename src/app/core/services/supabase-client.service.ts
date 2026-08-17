/**
 * Dip Hunter Supabase browser client.
 * Empty URL/anon key keeps mock local auth (tests and offline demos).
 */

import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseClientService {
  readonly url = (environment.supabaseUrl || '').trim();
  readonly anonKey = (environment.supabaseAnonKey || '').trim();
  readonly isEnabled = Boolean(this.url && this.anonKey);
  readonly client: SupabaseClient | null;

  constructor() {
    this.client = this.isEnabled
      ? createClient(this.url, this.anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
          },
        })
      : null;
  }
}
