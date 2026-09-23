import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { DailyIdeasService } from './daily-ideas.service';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';
import { PortfolioService } from './portfolio.service';
import { QuoteService } from './quote.service';
import { SettingsService } from './settings.service';
import { CurrencyService } from './currency.service';
import { HoldingsService } from './holdings.service';
import { LanguageService } from './language.service';
import { istCalendarDate } from './dip-signal.service';
import { Stock } from '../models/stock.model';
import { DailyIdeasBrief } from '../models/plan.model';

function stock(symbol: string, displayName = symbol): Stock {
  return {
    id: symbol,
    symbol,
    displayName,
    exchange: 'NSE',
    folderId: 'GROWTH_20',
    rank: 1,
    isActive: true,
    sector: 'IT',
    createdAt: '',
    updatedAt: '',
  };
}

describe('DailyIdeasService', () => {
  let service: DailyIdeasService;
  let httpMock: HttpTestingController;
  let store: Record<string, string>;
  const authed = signal(true);
  const user = signal<{ id: string } | null>({ id: 'user-1' });
  const stocks = signal<Stock[]>([
    stock('TCS', 'Tata Consultancy Services'),
    stock('INFY', 'Infosys'),
    stock('RELIANCE', 'Reliance Industries'),
  ]);
  const quotes = signal<Record<string, { price: number; changePercent: number }>>({
    TCS: { price: 3500, changePercent: -0.5 },
    INFY: { price: 1500, changePercent: -3.2 },
    RELIANCE: { price: 1400, changePercent: 1.1 },
  });

  beforeEach(() => {
    store = {};
    authed.set(true);
    user.set({ id: 'user-1' });
    stocks.set([
      stock('TCS', 'Tata Consultancy Services'),
      stock('INFY', 'Infosys'),
      stock('RELIANCE', 'Reliance Industries'),
    ]);

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => store[key] ?? null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      store[key] = value;
    });

    TestBed.configureTestingModule({
      providers: [
        DailyIdeasService,
        StorageService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { isAuthenticated: authed, user } },
        { provide: PortfolioService, useValue: { activeStocks: stocks } },
        { provide: QuoteService, useValue: { quotes } },
        { provide: SettingsService, useValue: { settings: signal({ yahooProxyUrl: '' }) } },
        { provide: CurrencyService, useValue: { displayCurrency: signal('INR') } },
        { provide: HoldingsService, useValue: { getHolding: () => undefined } },
        {
          provide: LanguageService,
          useValue: {
            t: (key: string, params?: Record<string, string | number>) =>
              params ? `${key}:${params['name'] ?? ''}:${params['change'] ?? ''}` : key,
          },
        },
      ],
    });

    service = TestBed.inject(DailyIdeasService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  it('shows a cached brief for today without calling Gemini again', () => {
    const brief: DailyIdeasBrief = {
      asOfDate: istCalendarDate(),
      headline: 'Cached',
      ideas: [
        {
          symbol: 'TCS',
          displayName: 'Tata Consultancy Services',
          thesis: 'Quality compounder',
          horizon: 'medium',
          conviction: 'high',
          riskNote: 'IT spending can pause',
        },
      ],
      provider: 'gemini',
      disclaimer: 'AI-assisted suggestion — not financial advice.',
    };
    store['dh_daily_ideas'] = JSON.stringify({ users: { 'user-1': { brief } } });

    service.presentToday();

    httpMock.expectNone('/.netlify/functions/ai');
    expect(service.visible()).toBe(true);
    expect(service.brief()?.headline).toBe('Cached');
  });

  it('maps a Gemini response into today’s card and caches it', () => {
    service.presentToday();

    const req = httpMock.expectOne('/.netlify/functions/ai');
    expect(req.request.body.action).toBe('ideas');
    expect(req.request.body.stocks).toHaveLength(3);

    req.flush({
      ideas: {
        headline: 'Three ideas from the watchlist',
        model: 'gemini-3.5-flash',
        disclaimer: 'AI-assisted suggestion — not financial advice.',
        ideas: [
          {
            symbol: 'INFY',
            horizon: 'medium',
            conviction: 'high',
            thesis: 'A modest IT pullback.',
            riskNote: 'Deal flow can stay soft.',
          },
          {
            symbol: 'NOT-A-STOCK',
            horizon: 'short',
            conviction: 'low',
            thesis: 'Ignore me',
            riskNote: 'Unknown',
          },
        ],
      },
    });

    expect(service.visible()).toBe(true);
    expect(service.brief()?.provider).toBe('gemini');
    expect(service.brief()?.ideas.map((idea) => idea.symbol)).toEqual(['INFY']);
    expect(service.brief()?.asOfDate).toBe(istCalendarDate());

    service.presentToday();
    httpMock.expectNone('/.netlify/functions/ai');
  });

  it('falls back to watchlist ideas when Gemini is unavailable', () => {
    service.presentToday();

    const req = httpMock.expectOne('/.netlify/functions/ai');
    req.flush(
      { error: 'Gemini is not configured', code: 'GEMINI_API_KEY_MISSING' },
      { status: 503, statusText: 'Service Unavailable' }
    );

    expect(service.brief()?.provider).toBe('local');
    expect(service.brief()?.ideas.map((idea) => idea.symbol)).toEqual(['INFY', 'TCS', 'RELIANCE']);
    expect(service.brief()?.ideas[0].conviction).toBe('high');
    expect(service.visible()).toBe(true);
  });

  it('stays hidden for the rest of the IST day after close', () => {
    service.presentToday();
    httpMock.expectOne('/.netlify/functions/ai').flush({
      ideas: {
        headline: 'Today',
        ideas: [
          {
            symbol: 'TCS',
            horizon: 'long',
            conviction: 'medium',
            thesis: 'Core compounder',
            riskNote: 'Valuation',
          },
        ],
      },
    });

    service.dismiss();
    expect(service.visible()).toBe(false);

    service.presentToday();
    httpMock.expectNone('/.netlify/functions/ai');
    expect(service.visible()).toBe(false);
  });

  it('does not open when there is no watchlist', () => {
    stocks.set([]);
    service.presentToday();
    httpMock.expectNone('/.netlify/functions/ai');
    expect(service.visible()).toBe(false);
  });
});
