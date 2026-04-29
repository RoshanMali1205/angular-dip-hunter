import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { LanguageService } from '../../../core/services/language.service';
import { validatePassword, getPasswordStrength } from '../../../core/models/auth.model';

@Component({
  selector: 'app-reset-password',
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
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>
        <h2 class="text-xl font-bold"
            [class.text-white]="themeService.isDark()"
            [class.text-gray-900]="themeService.isLight()">
          {{ lang.t('auth.resetPasswordTitle') }}
        </h2>
        <p class="text-sm mt-1"
           [class.text-slate-400]="themeService.isDark()"
           [class.text-gray-500]="themeService.isLight()">
          {{ lang.t('auth.resetPasswordSubtitle') }}
        </p>
      </div>

      <!-- Invalid / Expired Token -->
      @if (tokenInvalid()) {
        <div class="space-y-4">
          <div class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <div class="flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{{ lang.t('auth.resetTokenInvalid') }}</span>
            </div>
          </div>
          <a routerLink="/auth/forgot-password"
             class="block w-full text-center py-2.5 px-4 rounded-lg font-medium text-sm transition
                    bg-gradient-to-r from-emerald-500 to-cyan-500 text-white
                    hover:from-emerald-400 hover:to-cyan-400">
            {{ lang.t('auth.requestNewLink') }}
          </a>
        </div>
      }

      <!-- Success State -->
      @else if (resetSuccess()) {
        <div class="space-y-4">
          <div class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-400 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ lang.t('auth.resetSuccess') }}
          </div>
          <a routerLink="/auth/login"
             class="block w-full text-center py-2.5 px-4 rounded-lg font-medium text-sm transition
                    bg-gradient-to-r from-emerald-500 to-cyan-500 text-white
                    hover:from-emerald-400 hover:to-cyan-400 shadow-lg hover:shadow-emerald-500/25">
            {{ lang.t('auth.signIn') }}
          </a>
        </div>
      }

      <!-- Reset Form -->
      @else if (!tokenInvalid()) {
        <!-- Error Alert -->
        @if (authService.error()) {
          <div class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <div class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {{ authService.error() }}
            </div>
          </div>
        }

        <form (ngSubmit)="onSubmit()" class="space-y-4">
          <!-- New Password -->
          <div>
            <label class="block text-sm font-medium mb-1.5"
                   [class.text-slate-300]="themeService.isDark()"
                   [class.text-gray-700]="themeService.isLight()">
              {{ lang.t('auth.newPassword') }}
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5"
                     [class.text-slate-500]="themeService.isDark()"
                     [class.text-gray-400]="themeService.isLight()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                [type]="showPassword() ? 'text' : 'password'"
                [(ngModel)]="password"
                name="password"
                required
                [placeholder]="lang.t('auth.passwordPlaceholder')"
                class="w-full pl-10 pr-12 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                [class.bg-slate-800]="themeService.isDark()"
                [class.border-slate-700]="themeService.isDark()"
                [class.text-white]="themeService.isDark()"
                [class.placeholder-slate-500]="themeService.isDark()"
                [class.bg-white]="themeService.isLight()"
                [class.border-gray-300]="themeService.isLight()"
                [class.text-gray-900]="themeService.isLight()"
                [class.placeholder-gray-400]="themeService.isLight()">
              <button type="button" (click)="showPassword.update(v => !v)"
                class="absolute inset-y-0 right-0 flex items-center pr-3"
                [class.text-slate-500]="themeService.isDark()"
                [class.text-gray-400]="themeService.isLight()">
                @if (showPassword()) {
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                }
              </button>
            </div>

            <!-- Password Strength Bar -->
            @if (password) {
              <div class="mt-2 space-y-1">
                <div class="flex gap-1">
                  @for (i of [1,2,3,4]; track i) {
                    <div class="h-1 flex-1 rounded-full transition-all duration-300"
                         [class.bg-red-500]="passwordStrength() >= i && passwordStrength() === 1"
                         [class.bg-amber-500]="passwordStrength() >= i && passwordStrength() === 2"
                         [class.bg-emerald-500]="passwordStrength() >= i && passwordStrength() >= 3"
                         [class.bg-slate-700]="passwordStrength() < i && themeService.isDark()"
                         [class.bg-gray-200]="passwordStrength() < i && themeService.isLight()"></div>
                  }
                </div>
                @if (passwordErrors().length > 0) {
                  <p class="text-xs text-red-400">{{ passwordErrors()[0] }}</p>
                }
              </div>
            }
          </div>

          <!-- Confirm Password -->
          <div>
            <label class="block text-sm font-medium mb-1.5"
                   [class.text-slate-300]="themeService.isDark()"
                   [class.text-gray-700]="themeService.isLight()">
              {{ lang.t('auth.confirmPassword') }}
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5"
                     [class.text-slate-500]="themeService.isDark()"
                     [class.text-gray-400]="themeService.isLight()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                [type]="showConfirmPassword() ? 'text' : 'password'"
                [(ngModel)]="confirmPassword"
                name="confirmPassword"
                required
                [placeholder]="lang.t('auth.confirmPasswordPlaceholder')"
                class="w-full pl-10 pr-12 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                [class.bg-slate-800]="themeService.isDark()"
                [class.border-slate-700]="themeService.isDark()"
                [class.text-white]="themeService.isDark()"
                [class.placeholder-slate-500]="themeService.isDark()"
                [class.border-red-500]="confirmPassword && password !== confirmPassword"
                [class.bg-white]="themeService.isLight()"
                [class.border-gray-300]="themeService.isLight() && !(confirmPassword && password !== confirmPassword)"
                [class.text-gray-900]="themeService.isLight()"
                [class.placeholder-gray-400]="themeService.isLight()">
              <button type="button" (click)="showConfirmPassword.update(v => !v)"
                class="absolute inset-y-0 right-0 flex items-center pr-3"
                [class.text-slate-500]="themeService.isDark()"
                [class.text-gray-400]="themeService.isLight()">
                @if (showConfirmPassword()) {
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                }
              </button>
            </div>
            @if (confirmPassword && password !== confirmPassword) {
              <p class="mt-1 text-xs text-red-400">{{ lang.t('auth.passwordsMustMatch') }}</p>
            }
          </div>

          <button
            type="submit"
            [disabled]="authService.isLoading() || !isFormValid()"
            class="w-full py-2.5 px-4 rounded-lg font-medium text-white transition-all duration-200
                   bg-gradient-to-r from-emerald-500 to-cyan-500
                   hover:from-emerald-400 hover:to-cyan-400
                   focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
                   disabled:opacity-50 disabled:cursor-not-allowed
                   shadow-lg hover:shadow-emerald-500/25">
            @if (authService.isLoading()) {
              <span class="flex items-center justify-center gap-2">
                <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ lang.t('auth.resettingPassword') }}
              </span>
            } @else {
              {{ lang.t('auth.resetPasswordBtn') }}
            }
          </button>
        </form>
      }
    </div>
  `
})
export class ResetPasswordPageComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly themeService = inject(ThemeService);
  protected readonly lang = inject(LanguageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  password = '';
  confirmPassword = '';
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  tokenInvalid = signal(false);
  resetSuccess = signal(false);

  private token = '';

  ngOnInit(): void {
    void this.initializeTokenValidation();
  }

  private async initializeTokenValidation(): Promise<void> {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.token = token;
    const validEmail = token ? await this.authService.validateResetToken(token) : null;
    if (!validEmail) {
      this.tokenInvalid.set(true);
    }
  }

  passwordStrength(): number {
    return getPasswordStrength(this.password);
  }

  passwordErrors(): string[] {
    return validatePassword(this.password).errors;
  }

  isFormValid(): boolean {
    return (
      this.password.length > 0 &&
      this.password === this.confirmPassword &&
      validatePassword(this.password).valid
    );
  }

  async onSubmit(): Promise<void> {
    if (!this.isFormValid()) return;
    const success = await this.authService.resetPassword(this.token, this.password);
    if (success) {
      this.resetSuccess.set(true);
      setTimeout(() => this.router.navigate(['/auth/login'], {
        queryParams: { passwordReset: 'true' }
      }), 3000);
    }
  }
}
