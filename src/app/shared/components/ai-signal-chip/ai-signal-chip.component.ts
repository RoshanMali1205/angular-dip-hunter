/**
 * AI Signal chip with the rationale behind BUY / WATCH / SKIP.
 * Table cells are tight, so the why-text opens on tap (works on mobile too).
 */

import { Component, ElementRef, HostListener, input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DipPick } from '../../../core/models/plan.model';
import { LanguageService, ThemeService } from '../../../core/services';
import { dipActionDotClasses, dipActionPillClasses } from '../../utils/dip-signal-ui';

@Component({
  selector: 'app-ai-signal-chip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="button"
      class="relative inline-flex max-w-full text-left"
      (click)="toggle($event)"
      [attr.aria-expanded]="open()"
      [attr.aria-label]="whyTitle()">
      <span [class]="pillClasses()">
        <span [class]="dotClasses()"></span>
        {{ actionLabel() }}
      </span>
    </button>

    @if (showInlineReason() && pick().rationale) {
      <p class="mt-1 text-[11px] leading-snug line-clamp-2"
         [class.text-slate-400]="isDark()"
         [class.text-gray-500]="!isDark()">
        {{ pick().rationale }}
      </p>
    }

    @if (open()) {
      <div class="fixed z-[90] w-64 rounded-xl border p-3 shadow-xl backdrop-blur-xl"
           [style.top.px]="top()"
           [style.left.px]="left()"
           [class.bg-slate-900/95]="isDark()"
           [class.border-slate-600/70]="isDark()"
           [class.bg-white/95]="!isDark()"
           [class.border-gray-200]="!isDark()"
           (click)="$event.stopPropagation()">
        <p class="text-[10px] font-semibold uppercase tracking-wide"
           [class.text-slate-400]="isDark()"
           [class.text-gray-500]="!isDark()">{{ whyTitle() }}</p>
        <p class="mt-1 text-xs leading-snug"
           [class.text-slate-200]="isDark()"
           [class.text-gray-800]="!isDark()">{{ pick().rationale }}</p>
        @if (pick().riskNote) {
          <p class="mt-2 text-[11px] leading-snug"
             [class.text-slate-400]="isDark()"
             [class.text-gray-500]="!isDark()">
            <span class="font-semibold">{{ lang.t('dashboard.riskLabel') }}:</span>
            {{ pick().riskNote }}
          </p>
        }
      </div>
    }
  `
})
export class AiSignalChipComponent {
  pick = input.required<DipPick>();
  showInlineReason = input(false);

  private theme = inject(ThemeService);
  readonly lang = inject(LanguageService);
  private host = inject(ElementRef<HTMLElement>);

  readonly isDark = this.theme.isDark;
  readonly open = signal(false);
  readonly top = signal(0);
  readonly left = signal(0);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    const target = event.target as Node | null;
    if (target && !this.host.nativeElement.contains(target)) {
      this.open.set(false);
    }
  }

  actionLabel(): string {
    const action = this.pick().action;
    if (action === 'buy') return this.lang.t('dashboard.dipBuy');
    if (action === 'watch') return this.lang.t('dashboard.dipWatch');
    return this.lang.t('dashboard.dipSkip');
  }

  whyTitle(): string {
    return this.lang.t('dashboard.whySignal', { action: this.actionLabel() });
  }

  pillClasses(): string {
    return dipActionPillClasses(this.pick().action, this.isDark());
  }

  dotClasses(): string {
    return dipActionDotClasses(this.pick().action);
  }

  toggle(event: Event): void {
    event.stopPropagation();
    const next = !this.open();
    this.open.set(next);
    if (!next) return;

    const rect = this.host.nativeElement.getBoundingClientRect();
    const width = 256;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const top = Math.min(rect.bottom + 6, window.innerHeight - 140);
    this.left.set(left);
    this.top.set(top);
  }
}
