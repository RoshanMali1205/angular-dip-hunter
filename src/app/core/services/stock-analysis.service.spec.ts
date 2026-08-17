import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { StockAnalysisService } from './stock-analysis.service';
import { QuoteService } from './quote.service';
import { PortfolioService } from './portfolio.service';
import { SettingsService } from './settings.service';
import { CurrencyService } from './currency.service';
import { StockViewModel } from '../models';
import { DipPrediction } from '../models/plan.model';

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

describe('StockAnalysisService', () => {
  let service: StockAnalysisService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        StockAnalysisService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: QuoteService,
          useValue: { quotes: signal({}) },
        },
        {
          provide: PortfolioService,
          useValue: { stocks: signal([]) },
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

    service = TestBed.inject(StockAnalysisService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('ranks a 2–8% pullback as a buy-zone dip', () => {
    const prediction = service.predictDips([
      makeStock({ symbol: 'TCS', sector: 'IT', price: 3500, changePercent: -4.2 }),
    ]);

    expect(prediction.provider).toBe('local');
    expect(prediction.picks).toHaveLength(1);
    expect(prediction.picks[0].action).toBe('buy');
    expect(prediction.picks[0].score).toBeGreaterThanOrEqual(70);
  });

  it('skips a sharp news-style drop', () => {
    const prediction = service.predictDips([
      makeStock({ symbol: 'AFFLE', sector: 'IT', price: 1400, changePercent: -16 }),
    ]);

    expect(prediction.picks[0].action).toBe('skip');
    expect(prediction.picks[0].dropType).toBe('news-based');
  });

  it('maps a Gemini predict response into a ranked prediction', () => {
    const stocks = [
      makeStock({ symbol: 'TCS', displayName: 'TCS', price: 3500, changePercent: -2 }),
      makeStock({ symbol: 'INFY', displayName: 'Infosys', price: 1500, changePercent: -6 }),
    ];

    let result: DipPrediction | null | undefined;
    service.fetchGeminiDipPredictions(stocks).subscribe((value) => {
      result = value;
    });

    const req = httpMock.expectOne('/.netlify/functions/ai');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.action).toBe('predict');
    expect(req.request.body.stocks).toHaveLength(2);

    req.flush({
      prediction: {
        summary: 'INFY is the cleaner dip',
        marketTone: 'cautious',
        picks: [
          {
            symbol: 'INFY',
            displayName: 'Infosys',
            score: 82,
            action: 'buy',
            confidence: 'high',
            dropType: 'technical',
            rationale: 'Deeper orderly pullback',
            riskNote: 'IT sector still mixed',
          },
          {
            symbol: 'TCS',
            displayName: 'TCS',
            score: 61,
            action: 'watch',
            confidence: 'medium',
            dropType: 'correction',
            rationale: 'Shallow dip',
            riskNote: 'Limited margin of safety',
          },
        ],
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        disclaimer: 'AI-assisted suggestion — not financial advice.',
      },
    });

    expect(result).toMatchObject({
      provider: 'gemini',
      marketTone: 'cautious',
      summary: 'INFY is the cleaner dip',
    });
    expect(result?.picks[0].symbol).toBe('INFY');
    expect(result?.picks[0].action).toBe('buy');
    expect(result?.picks).toHaveLength(2);
  });

  it('returns null when Gemini is unavailable', () => {
    const stocks = [makeStock({ symbol: 'TCS', price: 3500, changePercent: -3 })];

    let result: DipPrediction | null | undefined = undefined;
    service.fetchGeminiDipPredictions(stocks).subscribe((value) => {
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
