import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <!-- Auth Layout - Full Screen with Background -->
    <div class="relative min-h-screen flex items-center justify-center overflow-hidden">
      
      <!-- Background Image with Overlay -->
      <div class="absolute inset-0 z-0">
        <!-- Abstract Finance Background Pattern -->
        <div class="absolute inset-0"
             [class.bg-gradient-to-br]="true"
             [class.from-slate-950]="themeService.isDark()"
             [class.via-slate-900]="themeService.isDark()"
             [class.to-emerald-950]="themeService.isDark()"
             [class.from-gray-100]="themeService.isLight()"
             [class.via-white]="themeService.isLight()"
             [class.to-emerald-50]="themeService.isLight()">
        </div>
        
        <!-- Animated Background Pattern -->
        <svg class="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" stroke-width="0.5" 
                    [attr.stroke]="themeService.isDark() ? '#10b981' : '#059669'" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        <!-- Floating Shapes -->
        <div class="absolute top-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div class="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style="animation-delay: 1s;"></div>
        <div class="absolute top-1/2 left-1/3 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style="animation-delay: 2s;"></div>
        
        <!-- Stock Chart SVG Pattern -->
        <svg class="absolute bottom-0 left-0 w-full h-64 opacity-20" viewBox="0 0 1200 200" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#10b981" />
              <stop offset="50%" stop-color="#06b6d4" />
              <stop offset="100%" stop-color="#10b981" />
            </linearGradient>
          </defs>
          <path d="M0,150 Q100,120 200,140 T400,100 T600,130 T800,80 T1000,110 T1200,90" 
                fill="none" stroke="url(#chartLine)" stroke-width="2"/>
          <path d="M0,180 Q150,160 300,170 T600,140 T900,160 T1200,130" 
                fill="none" stroke="url(#chartLine)" stroke-width="1.5" opacity="0.5"/>
        </svg>

        <!-- Dark overlay for better contrast -->
        <div class="absolute inset-0"
             [class.bg-black/40]="themeService.isDark()"
             [class.bg-white/30]="themeService.isLight()">
        </div>
      </div>

      <!-- Content Container -->
      <div class="relative z-10 w-full max-w-md px-4 py-8">
        <!-- Branding -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg"
               [class.bg-gradient-to-br]="true"
               [class.from-emerald-500]="true"
               [class.to-cyan-500]="true">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold"
              [class.text-white]="themeService.isDark()"
              [class.text-gray-900]="themeService.isLight()">Dip Hunter</h1>
          <p class="text-sm mt-1"
             [class.text-slate-400]="themeService.isDark()"
             [class.text-gray-500]="themeService.isLight()">Track · Plan · Grow</p>
        </div>

        <!-- Auth Card (router outlet for login/register) -->
        <div class="rounded-2xl border p-6 sm:p-8 shadow-2xl backdrop-blur-sm"
             [class.border-slate-700/50]="themeService.isDark()"
             [class.bg-slate-900/80]="themeService.isDark()"
             [class.border-gray-200]="themeService.isLight()"
             [class.bg-white/90]="themeService.isLight()">
          <router-outlet></router-outlet>
        </div>

        <!-- Footer -->
        <p class="text-center text-xs mt-6"
           [class.text-slate-500]="themeService.isDark()"
           [class.text-gray-400]="themeService.isLight()">
          © 2026 Dip Hunter · Stock Portfolio Dashboard
        </p>
      </div>
    </div>
  `,
  styles: [`
    @keyframes pulse {
      0%, 100% { opacity: 0.1; transform: scale(1); }
      50% { opacity: 0.2; transform: scale(1.05); }
    }
    .animate-pulse {
      animation: pulse 4s ease-in-out infinite;
    }
  `]
})
export class AuthLayoutComponent {
  protected readonly themeService = inject(ThemeService);
}
