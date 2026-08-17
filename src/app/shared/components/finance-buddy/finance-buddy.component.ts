/**
 * Finance Buddy floating chat window.
 * Visible on authenticated pages so Gemini is a first-class in-app surface.
 */

import { Component, ElementRef, ViewChild, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceBuddyService, LanguageService, ThemeService } from '../../../core/services';

@Component({
  selector: 'app-finance-buddy',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed z-[60] right-4 bottom-24 md:bottom-6">
      @if (buddy.isOpen()) {
        <div class="mb-3 flex w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border shadow-2xl"
             role="dialog"
             aria-label="Finance Buddy"
             [class.border-emerald-500/30]="isDark()"
             [class.bg-slate-900]="isDark()"
             [class.shadow-emerald-900/40]="isDark()"
             [class.border-emerald-200]="!isDark()"
             [class.bg-white]="!isDark()">

          <div class="flex items-center justify-between gap-2 border-b px-3 py-2.5"
               [class.border-slate-700/60]="isDark()"
               [class.bg-gradient-to-r]="true"
               [class.from-emerald-950/80]="isDark()"
               [class.to-cyan-950/50]="isDark()"
               [class.border-gray-100]="!isDark()"
               [class.from-emerald-50]="!isDark()"
               [class.to-cyan-50]="!isDark()">
            <div class="min-w-0">
              <p class="text-sm font-semibold"
                 [class.text-white]="isDark()"
                 [class.text-gray-900]="!isDark()">{{ lang.t('buddy.title') }}</p>
              <p class="text-[11px]"
                 [class.text-slate-400]="isDark()"
                 [class.text-gray-500]="!isDark()">{{ lang.t('buddy.subtitle') }}</p>
            </div>
            <div class="flex items-center gap-1">
              <button type="button"
                      (click)="buddy.clear()"
                      class="rounded-lg px-2 py-1 text-[11px] font-medium"
                      [class.text-slate-300]="isDark()"
                      [class.hover:bg-slate-800]="isDark()"
                      [class.text-gray-600]="!isDark()"
                      [class.hover:bg-gray-100]="!isDark()">
                {{ lang.t('buddy.clear') }}
              </button>
              <button type="button"
                      (click)="buddy.close()"
                      class="rounded-lg p-1"
                      [attr.aria-label]="lang.t('buddy.close')"
                      [class.text-slate-300]="isDark()"
                      [class.hover:bg-slate-800]="isDark()"
                      [class.text-gray-600]="!isDark()"
                      [class.hover:bg-gray-100]="!isDark()">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          <div #thread class="max-h-72 space-y-2 overflow-y-auto px-3 py-3">
            @for (msg of buddy.messages(); track msg.id) {
              <div class="flex"
                   [class.justify-end]="msg.role === 'user'"
                   [class.justify-start]="msg.role === 'assistant'">
                <div class="max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed"
                     [class.bg-emerald-600]="msg.role === 'user'"
                     [class.text-white]="msg.role === 'user'"
                     [class.rounded-br-md]="msg.role === 'user'"
                     [class.bg-slate-800]="msg.role === 'assistant' && isDark()"
                     [class.text-slate-200]="msg.role === 'assistant' && isDark()"
                     [class.bg-gray-100]="msg.role === 'assistant' && !isDark()"
                     [class.text-gray-800]="msg.role === 'assistant' && !isDark()"
                     [class.rounded-bl-md]="msg.role === 'assistant'">
                  {{ msg.text }}
                  @if (msg.role === 'assistant' && msg.provider === 'gemini') {
                    <p class="mt-1 text-[10px] opacity-70">Gemini</p>
                  }
                </div>
              </div>
            }
            @if (buddy.loading()) {
              <p class="text-[11px]"
                 [class.text-slate-400]="isDark()"
                 [class.text-gray-500]="!isDark()">{{ lang.t('buddy.thinking') }}</p>
            }
          </div>

          @if (buddy.messages().length <= 2) {
            <div class="flex flex-wrap gap-1.5 px-3 pb-2">
              @for (chip of buddy.suggestedPrompts(); track chip) {
                <button type="button"
                        (click)="sendChip(chip)"
                        class="rounded-full border px-2.5 py-1 text-[11px] font-medium"
                        [class.border-slate-700]="isDark()"
                        [class.text-slate-300]="isDark()"
                        [class.hover:border-emerald-400/50]="isDark()"
                        [class.border-gray-200]="!isDark()"
                        [class.text-gray-600]="!isDark()"
                        [class.hover:border-emerald-400]="!isDark()">
                  {{ chip }}
                </button>
              }
            </div>
          }

          <form (submit)="onSubmit($event)" class="flex items-end gap-2 border-t px-3 py-2.5"
                [class.border-slate-700/60]="isDark()"
                [class.border-gray-100]="!isDark()">
            <textarea
              rows="2"
              [(ngModel)]="draft"
              name="buddyDraft"
              [placeholder]="lang.t('buddy.placeholder')"
              (keydown.enter)="onEnter($event)"
              class="min-h-[2.5rem] flex-1 resize-none rounded-xl border px-3 py-2 text-xs outline-none"
              [class.bg-slate-800]="isDark()"
              [class.border-slate-700]="isDark()"
              [class.text-white]="isDark()"
              [class.placeholder:text-slate-500]="isDark()"
              [class.bg-gray-50]="!isDark()"
              [class.border-gray-200]="!isDark()"
              [class.text-gray-900]="!isDark()"></textarea>
            <button type="submit"
                    [disabled]="!draft.trim() || buddy.loading()"
                    class="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">
              {{ lang.t('buddy.send') }}
            </button>
          </form>
        </div>
      }

      <button type="button"
              (click)="buddy.toggle()"
              class="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 text-white shadow-lg shadow-emerald-900/30 transition hover:scale-105"
              [attr.aria-label]="lang.t('buddy.open')"
              [attr.title]="lang.t('buddy.title')">
        @if (buddy.isOpen()) {
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        } @else {
          <span class="text-xl">💬</span>
        }
      </button>
    </div>
  `,
})
export class FinanceBuddyComponent {
  buddy = inject(FinanceBuddyService);
  lang = inject(LanguageService);
  private theme = inject(ThemeService);

  isDark = this.theme.isDark;
  draft = '';

  @ViewChild('thread') private thread?: ElementRef<HTMLDivElement>;

  constructor() {
    effect(() => {
      this.buddy.messages();
      this.buddy.loading();
      queueMicrotask(() => this.scrollToEnd());
    });
  }

  onEnter(event: Event): void {
    const keyEvent = event as KeyboardEvent;
    if (keyEvent.shiftKey) return;
    keyEvent.preventDefault();
    this.submitDraft();
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.submitDraft();
  }

  sendChip(text: string): void {
    this.buddy.send(text);
  }

  private submitDraft(): void {
    const text = this.draft;
    this.draft = '';
    this.buddy.send(text);
  }

  private scrollToEnd(): void {
    const el = this.thread?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
