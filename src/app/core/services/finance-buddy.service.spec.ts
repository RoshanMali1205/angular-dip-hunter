import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { FinanceBuddyService } from './finance-buddy.service';
import { QuoteService } from './quote.service';
import { SettingsService } from './settings.service';
import { CurrencyService } from './currency.service';
import { HoldingsService } from './holdings.service';
import { PlannerService } from './planner.service';
import { PortfolioService } from './portfolio.service';
import { LanguageService } from './language.service';
import { ChatMessage } from '../models/plan.model';

describe('FinanceBuddyService', () => {
  let service: FinanceBuddyService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FinanceBuddyService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: QuoteService, useValue: { quotes: signal({
          TCS: { symbol: 'TCS', price: 3500, changePercent: -2 },
          INFY: { symbol: 'INFY', price: 1500, changePercent: -4.2 },
        }) } },
        {
          provide: SettingsService,
          useValue: {
            settings: signal({ yahooProxyUrl: '' }),
            isRed: (quote?: { changePercent?: number }) => (quote?.changePercent ?? 0) < 0,
          },
        },
        {
          provide: CurrencyService,
          useValue: {
            displayCurrency: signal('INR'),
            formatDisplay: (n: number) => `₹${n}`,
          },
        },
        {
          provide: HoldingsService,
          useValue: {
            summary: signal({
              holdingsCount: 2,
              totalInvested: 10000,
              totalCurrentValue: 11000,
              totalUnrealizedPL: 1000,
              totalUnrealizedPLPercent: 10,
              totalDividends: 0,
            }),
          },
        },
        {
          provide: PlannerService,
          useValue: {
            currentMonth: '2026-08',
            getDraftPlanForMonth: () => undefined,
            getCurrentPlan: () => undefined,
          },
        },
        { provide: PortfolioService, useValue: { activeStocks: signal([
          { symbol: 'TCS', displayName: 'TCS' },
          { symbol: 'INFY', displayName: 'Infosys' },
        ]) } },
        { provide: LanguageService, useValue: { t: (key: string) => key } },
      ],
    });

    service = TestBed.inject(FinanceBuddyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('starts with a welcome message', () => {
    expect(service.messages()[0].role).toBe('assistant');
    expect(service.messages()[0].text).toBe('buddy.welcome');
  });

  it('posts a chat action and appends the Gemini reply', () => {
    service.send('How is my portfolio?');

    const req = httpMock.expectOne('/.netlify/functions/ai');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.action).toBe('chat');
    expect(req.request.body.message).toBe('How is my portfolio?');

    req.flush({
      reply: 'Two holdings, up about 10%.',
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      disclaimer: 'AI-assisted suggestion — not financial advice.',
    });

    const assistant = service.messages().at(-1) as ChatMessage;
    expect(assistant.role).toBe('assistant');
    expect(assistant.provider).toBe('gemini');
    expect(assistant.text).toContain('Two holdings');
    expect(service.loading()).toBe(false);
  });

  it('falls back to a local reply when Gemini is unavailable', () => {
    service.send('How is my portfolio?');

    const req = httpMock.expectOne('/.netlify/functions/ai');
    req.flush(
      { error: 'Gemini is not configured', code: 'GEMINI_API_KEY_MISSING' },
      { status: 503, statusText: 'Service Unavailable' }
    );

    const assistant = service.messages().at(-1) as ChatMessage;
    expect(assistant.provider).toBe('local');
    expect(assistant.text).toContain('2 holdings');
    expect(assistant.text).toContain('buddy.geminiMissing');
  });

  it('attaches a dip table sorted deepest-first when Gemini is unavailable', () => {
    service.send('Which dips look good?');

    const req = httpMock.expectOne('/.netlify/functions/ai');
    req.flush(
      { error: 'Gemini is not configured', code: 'GEMINI_API_KEY_MISSING' },
      { status: 503, statusText: 'Service Unavailable' }
    );

    const assistant = service.messages().at(-1) as ChatMessage;
    expect(assistant.table?.columns.map((c) => c.key)).toEqual(['stock', 'change', 'price']);
    expect(assistant.table?.rows.map((r) => r['stock'])).toEqual(['INFY', 'TCS']);
    expect(assistant.table?.rows[0]['change']).toBe('-4.2%');
    expect(assistant.text).not.toContain('INFY (');
  });

  it('answers NSE hours from built-in knowledge when Gemini is unavailable', () => {
    service.send('When does NSE open?');

    const req = httpMock.expectOne('/.netlify/functions/ai');
    req.flush(
      { error: 'Gemini is not configured', code: 'GEMINI_API_KEY_MISSING' },
      { status: 503, statusText: 'Service Unavailable' }
    );

    const assistant = service.messages().at(-1) as ChatMessage;
    expect(assistant.provider).toBe('local');
    expect(assistant.table).toBeUndefined();
    expect(assistant.text).toContain('09:15');
    expect(assistant.text).toContain('Not financial advice');
    expect(assistant.text).toContain('buddy.geminiMissing');
  });

  it('answers NSE closing questions from built-in knowledge', () => {
    service.send('NSE closing today?');

    const req = httpMock.expectOne('/.netlify/functions/ai');
    req.flush(
      { error: 'Gemini is not configured', code: 'GEMINI_API_KEY_MISSING' },
      { status: 503, statusText: 'Service Unavailable' }
    );

    const assistant = service.messages().at(-1) as ChatMessage;
    expect(assistant.text).toContain('15:30');
    expect(assistant.text).not.toContain('buddy.offlineHelp');
    expect(assistant.text).toContain('buddy.geminiMissing');
  });

  it('explains a missing Gemini key when the question has no local fact', () => {
    service.send('What is the weather on Mars?');

    const req = httpMock.expectOne('/.netlify/functions/ai');
    req.flush(
      { error: 'Gemini is not configured', code: 'GEMINI_API_KEY_MISSING' },
      { status: 503, statusText: 'Service Unavailable' }
    );

    const assistant = service.messages().at(-1) as ChatMessage;
    expect(assistant.text).toContain('buddy.offlineHelp');
    expect(assistant.text).toContain('buddy.geminiMissing');
  });

  it('includes an NSE/BSE market chip among suggested prompts', () => {
    expect(service.suggestedPrompts()).toContain('buddy.chipMarket');
  });
});
