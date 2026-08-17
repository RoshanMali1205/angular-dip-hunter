/**
 * Handles Supabase email-link callbacks (confirm signup + password recovery).
 */

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CloudSyncService } from '../../../core/services/cloud-sync.service';
import { SupabaseClientService } from '../../../core/services/supabase-client.service';
import { ThemeService } from '../../../core/services/theme.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <p class="text-sm"
         [class.text-slate-300]="theme.isDark()"
         [class.text-gray-700]="theme.isLight()">
        {{ message() }}
      </p>
    </div>
  `,
})
export class AuthCallbackPageComponent implements OnInit {
  private router = inject(Router);
  private auth = inject(AuthService);
  private sync = inject(CloudSyncService);
  private supabase = inject(SupabaseClientService);
  protected theme = inject(ThemeService);
  protected lang = inject(LanguageService);
  message = signal('Signing you in…');

  async ngOnInit(): Promise<void> {
    const client = this.supabase.client;
    if (!client) {
      await this.router.navigate(['/auth/login']);
      return;
    }

    try {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      if (code) {
        const { error } = await client.auth.exchangeCodeForSession(code);
        if (error) throw error;
      }

      await this.auth.whenReady();
      const { data } = await client.auth.getSession();
      const type =
        url.searchParams.get('type') ||
        new URLSearchParams(window.location.hash.replace(/^#/, '')).get('type');

      if (type === 'recovery' || this.isRecoveryHash()) {
        await this.router.navigate(['/auth/reset-password']);
        return;
      }

      if (data.session) {
        await this.sync.pull();
        await this.router.navigateByUrl('/');
        return;
      }

      this.message.set(this.lang.t('auth.callbackFailed'));
      await this.router.navigate(['/auth/login']);
    } catch (err) {
      console.error('[auth-callback]', err);
      this.message.set(this.lang.t('auth.callbackFailed'));
      await this.router.navigate(['/auth/login']);
    }
  }

  private isRecoveryHash(): boolean {
    return window.location.hash.includes('type=recovery');
  }
}
