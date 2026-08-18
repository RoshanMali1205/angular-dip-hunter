import { Component, inject, signal, effect, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogService, DialogType } from './dialog.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (dialogService.state(); as dlg) {
      <div class="fixed inset-0 z-[9999]">
        <!-- Backdrop (behind panel — must not intercept panel clicks) -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
             (click)="onCancel()"></div>

        <!-- Dialog Panel -->
        <div class="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div class="pointer-events-auto relative z-10 w-full rounded-2xl border shadow-2xl animate-scaleIn"
             [class.max-w-lg]="!!dlg.table"
             [class.max-w-md]="!dlg.table"
             [class.border-slate-700]="themeService.isDark()"
             [class.bg-slate-800]="themeService.isDark()"
             [class.border-gray-200]="themeService.isLight()"
             [class.bg-white]="themeService.isLight()"
             role="dialog" aria-modal="true">

          <!-- Header -->
          <div class="flex items-center gap-3 px-5 pt-5 pb-2">
            <!-- Icon -->
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                 [ngClass]="iconBgClass(dlg.type)">
              @switch (dlg.type) {
                @case ('danger') {
                  <svg class="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                  </svg>
                }
                @case ('confirm') {
                  <svg class="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                }
                @case ('alert') {
                  <svg class="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                }
                @case ('prompt') {
                  <svg class="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                }
              }
            </div>
            <h3 class="text-base font-semibold"
                [class.text-white]="themeService.isDark()"
                [class.text-gray-900]="themeService.isLight()">{{ dlg.title }}</h3>
          </div>

          <!-- Body -->
          <div class="px-5 py-3">
            <p class="text-sm leading-relaxed whitespace-pre-line"
               [class.text-slate-300]="themeService.isDark()"
               [class.text-gray-600]="themeService.isLight()">{{ dlg.message }}</p>

            <!-- Detail table (execute plan / draft) -->
            @if (dlg.table; as table) {
              <div class="mt-3 overflow-hidden rounded-lg border"
                   [class.border-slate-700]="themeService.isDark()"
                   [class.border-gray-200]="themeService.isLight()">
                <div class="max-h-56 overflow-auto">
                  <table class="w-full min-w-[18rem] border-collapse text-xs">
                    <thead class="sticky top-0"
                           [class.bg-slate-900]="themeService.isDark()"
                           [class.bg-gray-50]="themeService.isLight()">
                      <tr>
                        @for (col of table.columns; track col.key) {
                          <th class="px-2.5 py-2 font-semibold whitespace-nowrap"
                              [class.text-left]="col.align !== 'right'"
                              [class.text-right]="col.align === 'right'"
                              [class.text-slate-400]="themeService.isDark()"
                              [class.text-gray-500]="themeService.isLight()">
                            {{ col.label }}
                          </th>
                        }
                      </tr>
                    </thead>
                    <tbody>
                      @for (row of table.rows; track $index) {
                        <tr [class.border-t]="true"
                            [class.border-slate-700/60]="themeService.isDark()"
                            [class.border-gray-100]="themeService.isLight()">
                          @for (col of table.columns; track col.key) {
                            <td class="px-2.5 py-1.5 whitespace-nowrap"
                                [class.text-left]="col.align !== 'right'"
                                [class.text-right]="col.align === 'right'"
                                [class.tabular-nums]="col.align === 'right'"
                                [class.font-semibold]="col.key === 'stock'"
                                [class.text-slate-200]="themeService.isDark()"
                                [class.text-gray-800]="themeService.isLight()">
                              {{ row[col.key] }}
                            </td>
                          }
                        </tr>
                      }
                    </tbody>
                    @if (table.footer) {
                      <tfoot>
                        <tr [class.border-t]="true"
                            [class.border-slate-600]="themeService.isDark()"
                            [class.bg-slate-900/80]="themeService.isDark()"
                            [class.border-gray-200]="themeService.isLight()"
                            [class.bg-gray-50]="themeService.isLight()">
                          @for (col of table.columns; track col.key) {
                            <td class="px-2.5 py-2 font-semibold whitespace-nowrap"
                                [class.text-left]="col.align !== 'right'"
                                [class.text-right]="col.align === 'right'"
                                [class.tabular-nums]="col.align === 'right'"
                                [class.text-white]="themeService.isDark()"
                                [class.text-gray-900]="themeService.isLight()">
                              {{ table.footer[col.key] }}
                            </td>
                          }
                        </tr>
                      </tfoot>
                    }
                  </table>
                </div>
              </div>
            } @else if (dlg.details && dlg.details.length > 0) {
              <div class="mt-3 max-h-40 overflow-y-auto rounded-lg border p-3 text-xs space-y-1"
                   [class.border-slate-700]="themeService.isDark()"
                   [class.bg-slate-900/50]="themeService.isDark()"
                   [class.border-gray-200]="themeService.isLight()"
                   [class.bg-gray-50]="themeService.isLight()">
                @for (line of dlg.details; track $index) {
                  <p [class.text-slate-400]="themeService.isDark()"
                     [class.text-gray-500]="themeService.isLight()">{{ line }}</p>
                }
              </div>
            }

            <!-- Prompt input -->
            @if (dlg.type === 'prompt') {
              <input
                type="text"
                [ngModel]="inputValue()"
                (ngModelChange)="inputValue.set($event)"
                [placeholder]="dlg.inputPlaceholder || ''"
                (keydown.enter)="onConfirm()"
                class="mt-3 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                [class.border-slate-600]="themeService.isDark()"
                [class.bg-slate-700]="themeService.isDark()"
                [class.text-white]="themeService.isDark()"
                [class.border-gray-300]="themeService.isLight()"
                [class.bg-white]="themeService.isLight()"
                [class.text-gray-900]="themeService.isLight()"
                #promptInput>
            }
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-2 px-5 pb-5 pt-2">
            @if (dlg.type !== 'alert') {
              <button
                type="button"
                (click)="onCancel()"
                class="rounded-lg px-4 py-2 text-sm font-medium border transition"
                [class.border-slate-600]="themeService.isDark()"
                [class.text-slate-300]="themeService.isDark()"
                [class.hover:bg-slate-700]="themeService.isDark()"
                [class.border-gray-300]="themeService.isLight()"
                [class.text-gray-600]="themeService.isLight()"
                [class.hover:bg-gray-100]="themeService.isLight()">
                {{ dlg.cancelText || 'Cancel' }}
              </button>
            }
            <button
              type="button"
              (click)="onConfirm()"
              class="rounded-lg px-4 py-2 text-sm font-semibold text-white transition"
              [ngClass]="confirmBtnClass(dlg.type)">
              {{ dlg.confirmText || (dlg.type === 'alert' ? 'OK' : 'Confirm') }}
            </button>
          </div>
        </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.95) translateY(-8px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
    .animate-fadeIn  { animation: fadeIn 0.15s ease-out; }
    .animate-scaleIn { animation: scaleIn 0.2s ease-out; }
  `]
})
export class DialogComponent {
  readonly dialogService = inject(DialogService);
  readonly themeService = inject(ThemeService);

  inputValue = signal('');

  constructor() {
    effect(() => {
      const s = this.dialogService.state();
      if (s?.type === 'prompt') {
        this.inputValue.set(s.inputValue || '');
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.dialogService.state()) {
      this.onCancel();
    }
  }

  onConfirm(): void {
    const s = this.dialogService.state();
    if (!s) return;
    if (s.type === 'prompt') {
      this.dialogService._close(this.inputValue());
    } else {
      this.dialogService._close(true);
    }
  }

  onCancel(): void {
    const s = this.dialogService.state();
    if (!s) return;
    if (s.type === 'alert') {
      this.dialogService._close(true);
    } else if (s.type === 'prompt') {
      this.dialogService._close(null);
    } else {
      this.dialogService._close(false);
    }
  }

  iconBgClass(type: DialogType): string {
    switch (type) {
      case 'danger':  return 'bg-red-500/15';
      case 'confirm': return 'bg-emerald-500/15';
      case 'alert':   return 'bg-blue-500/15';
      case 'prompt':  return 'bg-purple-500/15';
    }
  }

  confirmBtnClass(type: DialogType): string {
    switch (type) {
      case 'danger':  return 'bg-red-600 hover:bg-red-500';
      case 'confirm': return 'bg-emerald-600 hover:bg-emerald-500';
      case 'alert':   return 'bg-blue-600 hover:bg-blue-500';
      case 'prompt':  return 'bg-purple-600 hover:bg-purple-500';
    }
  }
}
