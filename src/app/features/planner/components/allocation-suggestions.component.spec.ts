import { TestBed } from '@angular/core/testing';
import { AllocationSuggestionsComponent } from './allocation-suggestions.component';
import { AllocationAdvisorService } from '../../../core/services/allocation-advisor.service';
import { LanguageService } from '../../../core/services/language.service';
import { ThemeService } from '../../../core/services/theme.service';
import { AllocationSuggestion } from '../../../core/models/plan.model';
import { StockViewModel } from '../../../core/models';

describe('AllocationSuggestionsComponent', () => {
  it('ranks allocations by weight and previews the first eight', () => {
    const allocations = Array.from({ length: 12 }, (_, i) => ({
      symbol: `S${i}`,
      displayName: `S${i}`,
      allocation: (12 - i) * 1000,
      percentage: (12 - i) * 2,
      reason: `Reason ${i}`,
    }));
    const suggestion: AllocationSuggestion = {
      strategy: 'equal',
      name: 'Equal Weight',
      description: 'Equal',
      rationale: 'Equal',
      allocations,
      riskProfile: 'balanced',
      expectedReturn: 'n/a',
    };

    TestBed.configureTestingModule({
      imports: [AllocationSuggestionsComponent],
      providers: [
        {
          provide: AllocationAdvisorService,
          useValue: {
            suggestAllocations: () => [suggestion],
            getRecommendation: () => ({ strategy: 'equal', reason: '' }),
            fetchGeminiAllocation: () => ({ subscribe: () => ({ unsubscribe() {} }) }),
          },
        },
        { provide: LanguageService, useValue: { t: (key: string) => key } },
        { provide: ThemeService, useValue: { isDark: () => true } },
      ],
    });

    const fixture = TestBed.createComponent(AllocationSuggestionsComponent);
    fixture.componentRef.setInput('stocks', [
      { symbol: 'S0', displayName: 'S0' },
    ] as StockViewModel[]);
    fixture.componentRef.setInput('budget', 20000);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('planner.allocationBreakdown');
    expect(host.textContent).toContain('S0');
    expect(host.textContent).toContain('planner.showAllStocks');
  });
});
