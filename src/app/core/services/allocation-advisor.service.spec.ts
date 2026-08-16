import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { AllocationAdvisorService } from './allocation-advisor.service';
import { QuoteService } from './quote.service';
import { SettingsService } from './settings.service';
import { CurrencyService } from './currency.service';
import { StockViewModel } from '../models';

function makeStock(partial: Partial<StockViewModel> & Pick<StockViewModel, 'symbol'>): StockViewModel {
  return {
    stockId: partial.stockId ?? partial.symbol,
    symbol: partial.symbol,
    displayName: partial.displayName ?? partial.symbol,
    folderId: partial.folderId ?? 'GROWTH_20',
    rank: partial.rank ?? 1,
    isActive: partial.isActive ?? true,
    sector: partial.sector,
    price: partial.price,
    changePercent: partial.changePercent,
    isRed: partial.isRed ?? true,
    isInCurrentPlan: partial.isInCurrentPlan ?? false,
    holdingQty: partial.holdingQty,
  };
}

describe('AllocationAdvisorService', () => {
  let service: AllocationAdvisorService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AllocationAdvisorService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: QuoteService,
          useValue: { quotes: signal({}) },
        },
        {
          provide: SettingsService,
          useValue: { settings: signal({ yahooProxyUrl: '' }) },
        },
        {
          provide: CurrencyService,
          useValue: { displayCurrency: signal('INR') },
        },
      ],
    });

    service = TestBed.inject(AllocationAdvisorService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('returns three heuristic strategies', () => {
    const stocks = [
      makeStock({ symbol: 'TCS', sector: 'IT', price: 3500, changePercent: -2 }),
      makeStock({ symbol: 'INFY', sector: 'IT', price: 1500, changePercent: -1 }),
    ];

    const suggestions = service.suggestAllocations(stocks, 10000);
    expect(suggestions).toHaveLength(3);
    expect(suggestions.map((s) => s.strategy)).toEqual([
      'equal',
      'risk-adjusted',
      'defensive',
    ]);
  });

  it('maps a Gemini allocate response into a suggestion', () => {
    const stocks = [
      makeStock({ symbol: 'TCS', displayName: 'TCS', price: 3500, changePercent: -2 }),
      makeStock({ symbol: 'INFY', displayName: 'Infosys', price: 1500, changePercent: -3 }),
    ];

    let result: unknown;
    service.fetchGeminiAllocation(stocks, 10000).subscribe((value) => {
      result = value;
    });

    const req = httpMock.expectOne('/.netlify/functions/ai');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.action).toBe('allocate');
    expect(req.request.body.budget).toBe(10000);
    expect(req.request.body.stocks).toHaveLength(2);

    req.flush({
      suggestion: {
        strategy: 'gemini',
        name: 'Gemini Advisor',
        description: 'Bias toward deeper dips',
        rationale: 'INFY is down more',
        riskProfile: 'balanced',
        expectedReturn: '12-18%',
        allocations: [
          { symbol: 'TCS', displayName: 'TCS', allocation: 4000, percentage: 40, reason: 'Core holding' },
          { symbol: 'INFY', displayName: 'Infosys', allocation: 6000, percentage: 60, reason: 'Deeper dip' },
        ],
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        disclaimer: 'AI-assisted suggestion — not financial advice.',
      },
    });

    expect(result).toMatchObject({
      strategy: 'gemini',
      name: 'Gemini Advisor',
      provider: 'gemini',
    });
    expect((result as { allocations: unknown[] }).allocations).toHaveLength(2);
  });

  it('returns null when Gemini is unavailable', () => {
    const stocks = [makeStock({ symbol: 'TCS', price: 3500, changePercent: -1 })];

    let result: unknown = 'unset';
    service.fetchGeminiAllocation(stocks, 5000).subscribe((value) => {
      result = value;
    });

    const req = httpMock.expectOne('/.netlify/functions/ai');
    req.flush(
      { error: 'Gemini is not configured', code: 'GEMINI_API_KEY_MISSING' },
      { status: 503, statusText: 'Service Unavailable' }
    );

    expect(result).toBeNull();
  });
});
