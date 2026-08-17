import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { FinanceBuddyComponent } from './finance-buddy.component';
import { FinanceBuddyService } from '../../../core/services/finance-buddy.service';
import { ThemeService } from '../../../core/services/theme.service';
import { LanguageService } from '../../../core/services/language.service';

describe('FinanceBuddyComponent', () => {
  const isOpen = signal(false);
  const messages = signal([
    { id: 'welcome', role: 'assistant' as const, text: 'Hi', createdAt: '2026-08-17' },
  ]);

  const mockBuddy = {
    isOpen,
    loading: signal(false),
    messages,
    toggle: vi.fn(() => isOpen.update((v) => !v)),
    close: vi.fn(() => isOpen.set(false)),
    clear: vi.fn(),
    send: vi.fn(),
    suggestedPrompts: () => ['Which dips look good?'],
  };

  beforeEach(() => {
    isOpen.set(false);
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      imports: [FinanceBuddyComponent],
      providers: [
        { provide: FinanceBuddyService, useValue: mockBuddy },
        {
          provide: ThemeService,
          useValue: { isDark: () => true, isLight: () => false },
        },
        { provide: LanguageService, useValue: { t: (key: string) => key } },
      ],
    });
  });

  it('renders the launcher button', () => {
    const fixture = TestBed.createComponent(FinanceBuddyComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('button[aria-label="buddy.open"]')).toBeTruthy();
    expect(host.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens the chat window when the launcher is clicked', () => {
    const fixture = TestBed.createComponent(FinanceBuddyComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const launcher = host.querySelector('button[aria-label="buddy.open"]') as HTMLButtonElement;
    launcher.click();
    isOpen.set(true);
    fixture.detectChanges();

    expect(mockBuddy.toggle).toHaveBeenCalled();
    expect(host.querySelector('[role="dialog"]')).toBeTruthy();
    expect(host.textContent).toContain('buddy.title');
  });
});
