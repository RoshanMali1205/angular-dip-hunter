/**
 * Header bell for today's AI buy/watch picks.
 * Opens on demand — not an hourly popup.
 */

import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LanguageService, RecoInboxService, ThemeService } from '../../../core/services';
import { DipPick } from '../../../core/models/plan.model';
import { dipActionPillClasses, dipScoreTextClasses } from '../../utils/dip-signal-ui';

@Component({
  selector: 'app-reco-inbox',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative z-[200] reco-inbox-container">
      <button
        type="button"
        (click)="toggle($event)"
        class="relative rounded-xl p-2.5 transition-all duration-300 backdrop-blur-sm border overflow-hidden group shadow-sm"
        [class.bg-slate-800/60]="isDark()"
        [class.border-emerald-500/30]="isDark()"
        [class.text-slate-200]="isDark()"
        [class.hover:bg-slate-700/60]="isDark()"
        [class.bg-white/60]="!isDark()"
        [class.border-emerald-300]="!isDark()"
        [class.text-gray-700]="!isDark()"
        [class.hover:bg-gray-50/60]="!isDark()"
        [attr.aria-label]="lang.t('inbox.title')"
        [attr.title]="lang.t('inbox.title')">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
        @if (inbox.unreadCount() > 0) {
          <span class="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-[10px] font-bold text-white flex items-center justify-center">
            {{ inbox.unreadCount() }}
          </span>
        }
      </button>

      @if (open()) {
        <div class="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border overflow-hidden backdrop-blur-xl shadow-xl z-[9999]"
             [class.bg-slate-900/95]="isDark()"
             [class.border-emerald-500/30]="isDark()"
             [class.bg-white/95]="!isDark()"
             [class.border-emerald-200]="!isDark()">
          <div class="px-4 py-3 border-b"
               [class.border-slate-700/50]="isDark()"
               [class.border-gray-200]="!isDark()">
            <p class="text-sm font-semibold"
               [class.text-white]="isDark()"
               [class.text-gray-900]="!isDark()">{{ lang.t('inbox.title') }}</p>
            <p class="text-[11px] mt-0.5"
               [class.text-slate-400]="isDark()"
               [class.text-gray-500]="!isDark()">{{ lang.t('inbox.hint') }}</p>
          </div>

          <div class="max-h-80 overflow-y-auto">
            @if (inbox.picks().length === 0) {
              <p class="px-4 py-6 text-sm text-center"
                 [class.text-slate-400]="isDark()"
                 [class.text-gray-500]="!isDark()">
                {{ inbox.isFresh() ? lang.t('inbox.empty') : lang.t('inbox.stale') }}
              </p>
            } @else {
              @for (pick of inbox.picks(); track pick.symbol) {
                <button type="button"
                        (click)="openDashboard()"
                        class="w-full px-4 py-2.5 text-left flex items-center justify-between gap-2 transition"
                        [class.hover:bg-slate-800/50]="isDark()"
                        [class.hover:bg-gray-50]="!isDark()">
                  <div class="min-w-0">
                    <p class="text-sm font-semibold truncate"
                       [class.text-white]="isDark()"
                       [class.text-gray-900]="!isDark()">{{ pick.symbol }}</p>
                    <span class="mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                          [class]="pillClasses(pick)">
                      {{ actionLabel(pick) }}
                    </span>
                    @if (pick.rationale) {
                      <p class="mt-1 text-[11px] leading-snug line-clamp-2"
                         [class.text-slate-400]="isDark()"
                         [class.text-gray-500]="!isDark()">{{ pick.rationale }}</p>
                    }
                  </div>
                  <span class="text-sm font-bold shrink-0" [class]="scoreClasses(pick)">
                    {{ pick.score | number:'1.0-0' }}
                  </span>
                </button>
              }
            }
          </div>

          <div class="px-3 py-2 border-t"
               [class.border-slate-700/50]="isDark()"
               [class.border-gray-100]="!isDark()">
            <button type="button"
                    (click)="openDashboard()"
                    class="w-full rounded-lg px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 transition">
              {{ lang.t('inbox.openDashboard') }}
            </button>
          </div>
        </div>
      }
    </div>
  `
})
export class RecoInboxComponent {
  readonly inbox = inject(RecoInboxService);
  readonly lang = inject(LanguageService);
  private theme = inject(ThemeService);
  private router = inject(Router);
  private host = inject(ElementRef<HTMLElement>);

  readonly open = signal(false);
  readonly isDark = this.theme.isDark;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    const target = event.target as Node | null;
    if (target && !this.host.nativeElement.contains(target)) {
      this.open.set(false);
    }
  }

  toggle(event: Event): void {
    event.stopPropagation();
    const next = !this.open();
    this.open.set(next);
    if (next) this.inbox.markSeen();
  }

  openDashboard(): void {
    this.open.set(false);
    void this.router.navigateByUrl('/');
  }

  actionLabel(pick: DipPick): string {
    if (pick.action === 'buy') return this.lang.t('dashboard.dipBuy');
    if (pick.action === 'watch') return this.lang.t('dashboard.dipWatch');
    return this.lang.t('dashboard.dipSkip');
  }

  pillClasses(pick: DipPick): string {
    return dipActionPillClasses(pick.action, this.isDark());
  }

  scoreClasses(pick: DipPick): string {
    return dipScoreTextClasses(pick.action, this.isDark());
  }
}
