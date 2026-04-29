import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild, inject, input, output } from '@angular/core';
import { WhatsNewRelease, WhatsNewTag } from '../../../core/config/app-release.config';
import { LanguageService } from '../../../core/services/language.service';
import { ThemeService } from '../../../core/services/theme.service';
import { WhatsNewService } from '../../../core/services/whats-new.service';

@Component({
  selector: 'app-whats-new-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './whats-new-modal.component.html',
  styleUrl: './whats-new-modal.component.css'
})
export class WhatsNewModalComponent implements AfterViewInit, OnDestroy {
  readonly release = input.required<WhatsNewRelease>();
  readonly closed = output<void>();

  readonly themeService = inject(ThemeService);
  readonly lang = inject(LanguageService);
  private readonly whatsNewService = inject(WhatsNewService);
  @ViewChild('modalContainer') private modalContainer?: ElementRef<HTMLElement>;
  @ViewChild('ackButton') private ackButton?: ElementRef<HTMLButtonElement>;
  private previouslyFocusedElement: HTMLElement | null = null;
  private focusRestored = false;

  ngAfterViewInit(): void {
    this.previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    setTimeout(() => {
      this.ackButton?.nativeElement.focus();
    }, 0);
  }

  ngOnDestroy(): void {
    this.restoreFocus();
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: Event): void {
    event.preventDefault();
    this.acknowledge();
  }

  @HostListener('document:keydown.tab', ['$event'])
  onTabKeydown(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    const container = this.modalContainer?.nativeElement;
    if (!container) {
      return;
    }

    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length === 0) {
      keyboardEvent.preventDefault();
      return;
    }

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement as HTMLElement | null;

    if (keyboardEvent.shiftKey && (activeElement === first || !container.contains(activeElement))) {
      keyboardEvent.preventDefault();
      last.focus();
      return;
    }

    if (!keyboardEvent.shiftKey && (activeElement === last || !container.contains(activeElement))) {
      keyboardEvent.preventDefault();
      first.focus();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.acknowledge();
    }
  }

  acknowledge(): void {
    this.whatsNewService.markAsSeen();
    this.restoreFocus();
    this.closed.emit();
  }

  private restoreFocus(): void {
    if (this.focusRestored) {
      return;
    }

    this.focusRestored = true;
    this.previouslyFocusedElement?.focus();
  }

  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = [
      'a[href]',
      'area[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
      (element) => element.getAttribute('aria-disabled') !== 'true'
    );
  }

  iconPath(icon: WhatsNewRelease['highlights'][number]['icon']): string {
    switch (icon) {
      case 'rocket':
        return 'M5 15l7-7m0 0h5m-5 0v5M4 20l6-2m8-8l2-6m-4 4l2-2';
      case 'shield':
        return 'M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3zm-3 9l2 2 4-4';
      case 'spark':
      default:
        return 'M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3zm7 10l.9 2.1L22 16l-2.1.9L19 19l-.9-2.1L16 16l2.1-.9L19 13zM5 14l.6 1.4L7 16l-1.4.6L5 18l-.6-1.4L3 16l1.4-.6L5 14z';
    }
  }

  tagClass(tag: WhatsNewTag): string {
    switch (tag) {
      case 'new':
        return 'tag-new';
      case 'improved':
        return 'tag-improved';
      case 'fix':
      default:
        return 'tag-fix';
    }
  }
}