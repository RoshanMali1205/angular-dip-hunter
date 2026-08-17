import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { LanguageService } from '../../../core/services/language.service';

// ─── EmailJS Configuration ────────────────────────────────────────────────────
// To enable real email sending:
// 1. Create a free account at https://www.emailjs.com
// 2. Add an email service (Gmail, Outlook, etc.)
// 3. Create an email template with these variables:
//    - {{to_email}}   → recipient email address
//    - {{reset_link}} → the password reset URL
//    - {{user_name}}  → optional: recipient name
// 4. Fill in your Service ID, Template ID, and Public Key below
const EMAILJS_CONFIG = {
  serviceId: '',    // e.g. 'service_abc123'
  templateId: '',   // e.g. 'template_xyz789'
  publicKey: '',    // e.g. 'YOUR_PUBLIC_KEY'
};

const EMAILJS_CONFIGURED =
  EMAILJS_CONFIG.serviceId !== '' &&
  EMAILJS_CONFIG.templateId !== '' &&
  EMAILJS_CONFIG.publicKey !== '';

const DEMO_RESET_LINK_ENABLED =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="text-center">
        <div class="flex justify-center mb-3">
          <div class="w-12 h-12 rounded-full flex items-center justify-center
                      bg-gradient-to-br from-emerald-500/20 to-cyan-500/20
                      border border-emerald-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
        </div>
        <h2 class="text-xl font-bold"
            [class.text-white]="themeService.isDark()"
            [class.text-gray-900]="themeService.isLight()">
          {{ lang.t('auth.forgotPasswordTitle') }}
        </h2>
        <p class="text-sm mt-1"
           [class.text-slate-400]="themeService.isDark()"
           [class.text-gray-500]="themeService.isLight()">
          {{ lang.t('auth.forgotPasswordSubtitle') }}
        </p>
      </div>

      <!-- Success State -->
      @if (resetSent()) {
        <div class="space-y-4">
          <div class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            <div class="flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{{ lang.t('auth.resetEmailSent') }}</span>
            </div>
          </div>

          <!-- Demo mode: show reset link directly on screen -->
          @if (demoResetLink()) {
            <div class="rounded-lg border px-4 py-3 space-y-2"
                 [class.border-amber-500/30]="themeService.isDark()"
                 [class.bg-amber-500/10]="themeService.isDark()"
                 [class.border-amber-400/40]="themeService.isLight()"
                 [class.bg-amber-50]="themeService.isLight()">
              <p class="text-xs font-medium text-amber-400">
                {{ lang.t('auth.demoModeNotice') }}
              </p>
              <p class="text-xs break-all"
                 [class.text-amber-300]="themeService.isDark()"
                 [class.text-amber-700]="themeService.isLight()">
                {{ demoResetLink() }}
              </p>
              <button
                (click)="copyLink()"
                class="text-xs flex items-center gap-1 text-emerald-500 hover:text-emerald-400 transition">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {{ linkCopied() ? lang.t('auth.linkCopied') : lang.t('auth.copyLink') }}
              </button>
            </div>
          }

          <a routerLink="/auth/login"
             class="block w-full text-center py-2.5 px-4 rounded-lg font-medium text-sm transition
                    border border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10">
            {{ lang.t('auth.backToLogin') }}
          </a>
        </div>
      } @else {
        <!-- Error Alert -->
        @if (errorMessage()) {
          <div class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <div class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {{ errorMessage() }}
            </div>
          </div>
        }

        <!-- Form -->
        <form (ngSubmit)="onSubmit()" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1.5"
                   [class.text-slate-300]="themeService.isDark()"
                   [class.text-gray-700]="themeService.isLight()">
              {{ lang.t('auth.email') }}
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5"
                     [class.text-slate-500]="themeService.isDark()"
                     [class.text-gray-400]="themeService.isLight()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                type="email"
                [(ngModel)]="email"
                name="email"
                required
                [placeholder]="lang.t('auth.emailPlaceholder')"
                class="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                [class.bg-slate-800]="themeService.isDark()"
                [class.border-slate-700]="themeService.isDark()"
                [class.text-white]="themeService.isDark()"
                [class.placeholder-slate-500]="themeService.isDark()"
                [class.bg-white]="themeService.isLight()"
                [class.border-gray-300]="themeService.isLight()"
                [class.text-gray-900]="themeService.isLight()"
                [class.placeholder-gray-400]="themeService.isLight()">
            </div>
          </div>

          <button
            type="submit"
            [disabled]="isLoading() || !email"
            class="w-full py-2.5 px-4 rounded-lg font-medium text-white transition-all duration-200
                   bg-gradient-to-r from-emerald-500 to-cyan-500
                   hover:from-emerald-400 hover:to-cyan-400
                   focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
                   disabled:opacity-50 disabled:cursor-not-allowed
                   shadow-lg hover:shadow-emerald-500/25">
            @if (isLoading()) {
              <span class="flex items-center justify-center gap-2">
                <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ lang.t('auth.sendingReset') }}
              </span>
            } @else {
              {{ lang.t('auth.sendResetLink') }}
            }
          </button>
        </form>

        <p class="text-center text-sm"
           [class.text-slate-400]="themeService.isDark()"
           [class.text-gray-600]="themeService.isLight()">
          {{ lang.t('auth.rememberedPassword') }}
          <a routerLink="/auth/login" class="font-medium text-emerald-500 hover:text-emerald-400 transition">
            {{ lang.t('auth.backToLogin') }}
          </a>
        </p>
      }
    </div>
  `
})
export class ForgotPasswordPageComponent {
  protected readonly themeService = inject(ThemeService);
  protected readonly lang = inject(LanguageService);
  private readonly authService = inject(AuthService);

  email = '';
  isLoading = signal(false);
  resetSent = signal(false);
  errorMessage = signal<string | null>(null);
  demoResetLink = signal<string | null>(null);
  linkCopied = signal(false);

  async onSubmit(): Promise<void> {
    if (!this.email) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);

    // Simulate a short delay for UX
    await new Promise(r => setTimeout(r, 800));

    const token = await this.authService.requestPasswordReset(this.email);

    if (!token || token === 'supabase' || this.authService.usesCloudAuth) {
      this.isLoading.set(false);
      this.resetSent.set(true);
      return;
    }

    const resetLink = `${window.location.origin}/auth/reset-password?token=${token}`;

    if (EMAILJS_CONFIGURED) {
      await this.sendEmailViaEmailJS(this.email, resetLink);
    } else if (DEMO_RESET_LINK_ENABLED) {
      // Local dev mode only: show the link on screen
      this.demoResetLink.set(resetLink);
    }

    this.isLoading.set(false);
    this.resetSent.set(true);
  }

  private async sendEmailViaEmailJS(toEmail: string, resetLink: string): Promise<void> {
    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: EMAILJS_CONFIG.serviceId,
          template_id: EMAILJS_CONFIG.templateId,
          user_id: EMAILJS_CONFIG.publicKey,
          template_params: {
            to_email: toEmail,
            reset_link: resetLink,
          },
        }),
      });
      if (!response.ok) {
        console.error('EmailJS error:', response.status, await response.text());
        // Fall back to showing the link on screen
        this.demoResetLink.set(resetLink);
      }
    } catch (err) {
      console.error('Failed to send email:', err);
      this.demoResetLink.set(resetLink);
    }
  }

  copyLink(): void {
    const link = this.demoResetLink();
    if (link) {
      navigator.clipboard.writeText(link).then(() => {
        this.linkCopied.set(true);
        setTimeout(() => this.linkCopied.set(false), 2000);
      });
    }
  }
}
