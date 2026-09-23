import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { DailyIdeasCardComponent } from './daily-ideas-card.component';
import { DailyIdeasService } from '../../../core/services/daily-ideas.service';
import { ThemeService } from '../../../core/services/theme.service';
import { LanguageService } from '../../../core/services/language.service';
import { DailyIdeasBrief } from '../../../core/models/plan.model';

describe('DailyIdeasCardComponent', () => {
  const visible = signal(false);
  const loading = signal(false);
  const brief = signal<DailyIdeasBrief | null>(null);
  const presentToday = vi.fn();
  const dismiss = vi.fn(() => visible.set(false));

  const ideaBrief: DailyIdeasBrief = {
    asOfDate: '2026-09-23',
    headline: 'Three ideas for today',
    provider: 'gemini',
    disclaimer: 'AI-assisted suggestion — not financial advice.',
    ideas: [
      {
        symbol: 'INFY',
        displayName: 'Infosys',
        thesis: 'A modest IT pullback.',
        horizon: 'medium',
        conviction: 'high',
        riskNote: 'Deal flow can stay soft.',
      },
    ],
  };

  beforeEach(() => {
    visible.set(false);
    loading.set(false);
    brief.set(null);
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      imports: [DailyIdeasCardComponent],
      providers: [
        {
          provide: DailyIdeasService,
          useValue: { visible, loading, brief, presentToday, dismiss },
        },
        { provide: ThemeService, useValue: { isDark: () => true, isLight: () => false } },
        { provide: LanguageService, useValue: { t: (key: string) => key } },
      ],
    });
  });

  it('asks for today’s ideas once the card is allowed to show', () => {
    const fixture = TestBed.createComponent(DailyIdeasCardComponent);
    fixture.detectChanges();

    expect(presentToday).toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders the Gemini ideas and closes them for the day', () => {
    visible.set(true);
    brief.set(ideaBrief);

    const fixture = TestBed.createComponent(DailyIdeasCardComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.textContent).toContain('INFY');
    expect(host.textContent).toContain('A modest IT pullback.');

    host.querySelector<HTMLButtonElement>('button[aria-label="dailyIdeas.close"]')?.click();
    fixture.detectChanges();

    expect(dismiss).toHaveBeenCalled();
    expect(host.querySelector('[role="dialog"]')).toBeNull();
  });

  it('stays quiet while another overlay is in front', () => {
    const fixture = TestBed.createComponent(DailyIdeasCardComponent);
    fixture.componentRef.setInput('paused', true);
    visible.set(true);
    brief.set(ideaBrief);
    fixture.detectChanges();

    expect(presentToday).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="dialog"]')).toBeNull();
  });
});
