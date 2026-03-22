import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { LanguageService } from '../../../core/services/language.service';
import { getPasswordStrength, validatePassword } from '../../../core/models/auth.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <!-- Register Form -->
    <div class="space-y-6">
      <!-- Header -->
      <div class="text-center">
        <h2 class="text-xl font-bold"
            [class.text-white]="themeService.isDark()"
            [class.text-gray-900]="themeService.isLight()">{{ lang.t('auth.createAccount') }}</h2>
        <p class="text-sm mt-1"
           [class.text-slate-400]="themeService.isDark()"
           [class.text-gray-500]="themeService.isLight()">{{ lang.t('auth.registerSubtitle') }}</p>
      </div>

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

      @if (validationError()) {
        <div class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {{ validationError() }}
          </div>
        </div>
      }

      <!-- Form -->
      <form (ngSubmit)="onSubmit()" class="space-y-4">
        <!-- Name Field -->
        <div>
          <label class="block text-sm font-medium mb-1.5"
                 [class.text-slate-300]="themeService.isDark()"
                 [class.text-gray-700]="themeService.isLight()">{{ lang.t('auth.fullName') }}</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5"
                   [class.text-slate-500]="themeService.isDark()"
                   [class.text-gray-400]="themeService.isLight()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <input
              type="text"
              [(ngModel)]="name"
              name="name"
              required
              [placeholder]="lang.t('auth.namePlaceholder')"
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

        <!-- Email Field -->
        <div>
          <label class="block text-sm font-medium mb-1.5"
                 [class.text-slate-300]="themeService.isDark()"
                 [class.text-gray-700]="themeService.isLight()">{{ lang.t('auth.email') }}</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5"
                   [class.text-slate-500]="themeService.isDark()"
                   [class.text-gray-400]="themeService.isLight()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
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

        <!-- Password Field -->
        <div>
          <label class="block text-sm font-medium mb-1.5"
                 [class.text-slate-300]="themeService.isDark()"
                 [class.text-gray-700]="themeService.isLight()">{{ lang.t('auth.password') }}</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5"
                   [class.text-slate-500]="themeService.isDark()"
                   [class.text-gray-400]="themeService.isLight()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <input
              [type]="showPassword() ? 'text' : 'password'"
              [(ngModel)]="password"
              name="password"
              required
              (ngModelChange)="onPasswordChange($event)"
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
            <button
              type="button"
              (click)="togglePassword()"
              [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
              class="absolute inset-y-0 right-0 flex items-center pr-3 transition"
              [class.text-slate-500]="themeService.isDark()"
              [class.hover:text-slate-300]="themeService.isDark()"
              [class.text-gray-400]="themeService.isLight()"
              [class.hover:text-gray-600]="themeService.isLight()">
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
          
          <!-- Password Strength Indicator -->
          @if (password) {
            <div class="mt-2">
              <div class="flex gap-1">
                @for (i of [0, 1, 2, 3]; track i) {
                  <div class="h-1 flex-1 rounded-full transition-colors"
                       [class.bg-slate-700]="themeService.isDark() && i >= passwordStrength()"
                       [class.bg-gray-200]="themeService.isLight() && i >= passwordStrength()"
                       [class.bg-red-500]="i < passwordStrength() && passwordStrength() === 1"
                       [class.bg-amber-500]="i < passwordStrength() && passwordStrength() === 2"
                       [class.bg-emerald-400]="i < passwordStrength() && passwordStrength() === 3"
                       [class.bg-emerald-500]="i < passwordStrength() && passwordStrength() === 4">
                  </div>
                }
              </div>
              <p class="text-xs mt-1"
                 [class.text-red-400]="passwordStrength() === 1"
                 [class.text-amber-400]="passwordStrength() === 2"
                 [class.text-emerald-400]="passwordStrength() >= 3">
                {{ getStrengthLabel() }}
              </p>
            </div>
          }
        </div>

        <!-- Confirm Password Field -->
        <div>
          <label class="block text-sm font-medium mb-1.5"
                 [class.text-slate-300]="themeService.isDark()"
                 [class.text-gray-700]="themeService.isLight()">{{ lang.t('auth.confirmPassword') }}</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5"
                   [class.text-slate-500]="themeService.isDark()"
                   [class.text-gray-400]="themeService.isLight()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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
              [class.bg-white]="themeService.isLight()"
              [class.border-gray-300]="themeService.isLight()"
              [class.text-gray-900]="themeService.isLight()"
              [class.placeholder-gray-400]="themeService.isLight()"
              [class.border-red-500]="confirmPassword && password !== confirmPassword">
            <button
              type="button"
              (click)="toggleConfirmPassword()"
              [attr.aria-label]="showConfirmPassword() ? 'Hide password' : 'Show password'"
              class="absolute inset-y-0 right-0 flex items-center pr-3 transition"
              [class.text-slate-500]="themeService.isDark()"
              [class.hover:text-slate-300]="themeService.isDark()"
              [class.text-gray-400]="themeService.isLight()"
              [class.hover:text-gray-600]="themeService.isLight()">
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
            <p class="text-xs text-red-400 mt-1">{{ lang.t('auth.passwordsMustMatch') }}</p>
          }
        </div>

        <!-- Terms Agreement -->
        <label class="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            [(ngModel)]="agreeToTerms"
            name="agreeToTerms"
            class="w-4 h-4 mt-0.5 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0">
          <span class="text-sm"
                [class.text-slate-400]="themeService.isDark()"
                [class.text-gray-600]="themeService.isLight()">
            {{ lang.t('auth.agreeToTerms') }}
            <button type="button" class="text-emerald-500 hover:text-emerald-400 underline">{{ lang.t('auth.termsOfService') }}</button>
            {{ lang.t('auth.and') }}
            <button type="button" class="text-emerald-500 hover:text-emerald-400 underline">{{ lang.t('auth.privacyPolicy') }}</button>
          </span>
        </label>

        <!-- Submit Button -->
        <button
          type="submit"
          [disabled]="!isFormValid()"
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
              {{ lang.t('auth.creatingAccount') }}
            </span>
          } @else {
            {{ lang.t('auth.createAccountBtn') }}
          }
        </button>
      </form>

      <!-- Divider -->
      <div class="relative">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t"
               [class.border-slate-700]="themeService.isDark()"
               [class.border-gray-200]="themeService.isLight()"></div>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-2"
                [class.bg-slate-900]="themeService.isDark()"
                [class.text-slate-500]="themeService.isDark()"
                [class.bg-white]="themeService.isLight()"
                [class.text-gray-500]="themeService.isLight()">{{ lang.t('auth.or') }}</span>
        </div>
      </div>

      <!-- Login Link -->
      <p class="text-center text-sm"
         [class.text-slate-400]="themeService.isDark()"
         [class.text-gray-600]="themeService.isLight()">
        {{ lang.t('auth.haveAccount') }}
        <a routerLink="/auth/login" class="font-medium text-emerald-500 hover:text-emerald-400 transition">
          {{ lang.t('auth.signIn') }}
        </a>
      </p>
    </div>
  `
})
export class RegisterPageComponent {
  protected readonly authService = inject(AuthService);
  protected readonly themeService = inject(ThemeService);
  protected readonly lang = inject(LanguageService);

  // Form fields
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  agreeToTerms = false;
  
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  passwordStrength = signal(0);
  validationError = signal<string | null>(null);

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.update(v => !v);
  }

  onPasswordChange(password: string): void {
    this.passwordStrength.set(getPasswordStrength(password));
  }

  getStrengthLabel(): string {
    const strength = this.passwordStrength();
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    return labels[strength] || '';
  }

  isFormValid(): boolean {
    return !!(
      this.name &&
      this.email &&
      this.password &&
      this.confirmPassword &&
      this.password === this.confirmPassword &&
      this.agreeToTerms &&
      !this.authService.isLoading()
    );
  }

  async onSubmit(): Promise<void> {
    if (!this.isFormValid()) return;

    const validation = validatePassword(this.password);
    if (!validation.valid) {
      this.validationError.set(validation.errors[0]);
      return;
    }
    this.validationError.set(null);

    await this.authService.register({
      name: this.name,
      email: this.email,
      password: this.password
    });
  }
}
