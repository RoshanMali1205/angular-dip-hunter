import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AiSignalChipComponent } from './ai-signal-chip.component';
import { LanguageService } from '../../../core/services/language.service';
import { ThemeService } from '../../../core/services/theme.service';
import { DipPick } from '../../../core/models/plan.model';

const pick: DipPick = {
  symbol: 'TCS',
  displayName: 'TCS',
  score: 28,
  action: 'skip',
  confidence: 'medium',
  dropType: 'correction',
  rationale: 'Shallow -1.2% move — wait for a clearer dip.',
  riskNote: 'Buying here has little dip margin.',
};

describe('AiSignalChipComponent', () => {
  let fixture: ComponentFixture<AiSignalChipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiSignalChipComponent],
      providers: [
        {
          provide: ThemeService,
          useValue: { isDark: () => true, isLight: () => false, theme: signal('dark') },
        },
        {
          provide: LanguageService,
          useValue: {
            t: (key: string, params?: Record<string, string>) =>
              key === 'dashboard.whySignal' ? `Why ${params?.['action']}` : key,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AiSignalChipComponent);
    fixture.componentRef.setInput('pick', pick);
    fixture.detectChanges();
  });

  it('shows the skip rationale after the chip is tapped', () => {
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Shallow -1.2% move');
    expect(fixture.nativeElement.textContent).toContain('little dip margin');
  });
});
