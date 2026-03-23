/**
 * Tour Overlay Component
 * Renders the tour tooltip and backdrop
 * Author: Roshan Mali
 */

import { Component, inject, HostListener, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TourService } from '../../../core/services/tour.service';
import { ThemeService } from '../../../core/services/theme.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-tour-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (tourService.isActive()) {
      <!-- Backdrop -->
      <div class="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm transition-opacity duration-300"
           (click)="onBackdropClick($event)">
      </div>
      
      <!-- Tooltip -->
      <div class="fixed z-[1002] w-[320px] max-w-[calc(100vw-32px)] transition-all duration-300 ease-out"
           [class.bottom-4]="isMobile()"
           [class.left-1/2]="isMobile()"
           [class.-translate-x-1/2]="isMobile()"
           [style.top]="!isMobile() ? tooltipPosition().top : 'auto'"
           [style.left]="!isMobile() ? tooltipPosition().left : '50%'"
           [style.transform]="!isMobile() ? tooltipPosition().transform : 'translateX(-50%)'"
           role="dialog"
           aria-modal="true"
           [attr.aria-label]="lang.t(currentStep()?.titleKey || '')">
        
        <!-- Tooltip Card -->
        <div class="rounded-xl border shadow-2xl overflow-hidden"
             [class.bg-slate-800]="themeService.isDark()"
             [class.border-slate-700]="themeService.isDark()"
             [class.bg-white]="themeService.isLight()"
             [class.border-gray-200]="themeService.isLight()">
          
          <!-- Progress Bar -->
          <div class="h-1 bg-slate-700/50">
            <div class="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
                 [style.width.%]="tourService.progress()">
            </div>
          </div>
          
          <!-- Content -->
          <div class="p-4">
            <!-- Step Counter -->
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-medium px-2 py-0.5 rounded-full"
                    [class.bg-emerald-500/20]="themeService.isDark()"
                    [class.text-emerald-400]="themeService.isDark()"
                    [class.bg-emerald-100]="themeService.isLight()"
                    [class.text-emerald-600]="themeService.isLight()">
                {{ tourService.currentIndex() + 1 }} / {{ tourService.totalSteps() }}
              </span>
              
              <!-- Close Button -->
              <button (click)="skip()"
                      class="p-1 rounded-lg transition hover:bg-slate-700/50"
                      [class.text-slate-400]="themeService.isDark()"
                      [class.hover:text-slate-200]="themeService.isDark()"
                      [class.text-gray-500]="themeService.isLight()"
                      [class.hover:text-gray-700]="themeService.isLight()"
                      [attr.aria-label]="lang.t('tour.skip')">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <!-- Icon for Welcome/Complete -->
            @if (currentStep()?.position === 'center') {
              <div class="flex justify-center mb-4">
                @if (tourService.isFirstStep()) {
                  <div class="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                    <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                } @else if (tourService.isLastStep()) {
                  <div class="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                    <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                }
              </div>
            }
            
            <!-- Title -->
            <h3 class="text-base font-bold mb-2"
                [class.text-white]="themeService.isDark()"
                [class.text-gray-900]="themeService.isLight()">
              {{ lang.t(currentStep()?.titleKey || '') }}
            </h3>
            
            <!-- Description -->
            <p class="text-sm mb-4 leading-relaxed"
               [class.text-slate-300]="themeService.isDark()"
               [class.text-gray-600]="themeService.isLight()">
              {{ lang.t(currentStep()?.descriptionKey || '') }}
            </p>
            
            <!-- Actions -->
            <div class="flex items-center justify-between gap-2">
              <!-- Skip/Previous -->
              <button (click)="tourService.isFirstStep() ? skip() : previous()"
                      class="px-3 py-1.5 text-xs font-medium rounded-lg transition"
                      [class.text-slate-400]="themeService.isDark()"
                      [class.hover:text-white]="themeService.isDark()"
                      [class.hover:bg-slate-700]="themeService.isDark()"
                      [class.text-gray-500]="themeService.isLight()"
                      [class.hover:text-gray-700]="themeService.isLight()"
                      [class.hover:bg-gray-100]="themeService.isLight()">
                {{ tourService.isFirstStep() ? lang.t('tour.skip') : lang.t('tour.previous') }}
              </button>
              
              <!-- Next/Finish -->
              <button (click)="next()"
                      class="px-4 py-1.5 text-xs font-medium rounded-lg transition bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-400 hover:to-cyan-400 shadow-lg shadow-emerald-500/25">
                {{ tourService.isLastStep() ? lang.t('tour.finish') : lang.t('tour.next') }}
              </button>
            </div>
          </div>
        </div>
        
        <!-- Arrow pointer (for non-center positions) -->
        @if (currentStep()?.position !== 'center' && !isMobile()) {
          <div class="absolute w-3 h-3 rotate-45"
               [class.bg-slate-800]="themeService.isDark()"
               [class.border-slate-700]="themeService.isDark()"
               [class.bg-white]="themeService.isLight()"
               [class.border-gray-200]="themeService.isLight()"
               [ngClass]="getArrowClass()">
          </div>
        }
      </div>
    }
  `,
  styles: [`
    :host {
      display: contents;
    }
  `]
})
export class TourOverlayComponent {
  readonly tourService = inject(TourService);
  readonly themeService = inject(ThemeService);
  readonly lang = inject(LanguageService);

  readonly currentStep = this.tourService.currentStep;
  readonly tooltipPosition = computed(() => this.tourService.getTooltipPosition());

  // Keyboard navigation
  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    if (!this.tourService.isActive()) return;
    
    switch (event.key) {
      case 'Escape':
        this.skip();
        break;
      case 'Enter':
      case 'ArrowRight':
        this.next();
        break;
      case 'ArrowLeft':
        this.previous();
        break;
    }
  }

  isMobile(): boolean {
    return window.innerWidth < 640;
  }

  next(): void {
    this.tourService.next();
  }

  previous(): void {
    this.tourService.previous();
  }

  skip(): void {
    this.tourService.skip();
  }

  onBackdropClick(event: MouseEvent): void {
    // Only skip if clicking directly on backdrop, not on highlighted element
    if (event.target === event.currentTarget) {
      // Don't skip, just ignore backdrop clicks to prevent accidental dismissal
    }
  }

  getArrowClass(): string {
    const step = this.currentStep();
    if (!step) return '';
    
    switch (step.position) {
      case 'top':
        return 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-r border-b';
      case 'bottom':
        return 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 border-l border-t';
      case 'left':
        return 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 border-t border-r';
      case 'right':
        return 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 border-b border-l';
      default:
        return '';
    }
  }
}
