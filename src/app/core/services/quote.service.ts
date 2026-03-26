/**
 * Quote Service - Fetch and cache stock quotes
 * Supports Yahoo Finance API with CORS proxy or mock data
 */

import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin, catchError, map, tap, BehaviorSubject } from 'rxjs';
import { Quote, QuoteCache } from '../models/quote.model';
import { StorageService } from './storage.service';
import { SettingsService } from './settings.service';
import { NetworkStatusService } from './network-status.service';

// Batch quotes response from proxy server
interface BatchQuotesResponse {
  quotes: Record<string, {
    symbol: string;
    yahooSymbol: string;
    price: number;
    previousClose: number;
    change: number;
    changePercent: number;
    dayHigh: number;
    dayLow: number;
    volume: number;
    fiftyTwoWeekHigh: number;
    fiftyTwoWeekLow: number;
    currency: string;
    name: string;
    timestamp: string;
    source: string;
  }>;
  meta: {
    requested: number;
    success: number;
    cached: number;
    fetched: number;
    errors: number;
    timestamp: string;
  };
  errors?: { symbol: string; error?: string; status?: number }[];
}

// Finnhub single-quote response
interface FinnhubQuoteResponse {
  c: number;   // Current price
  d: number;   // Change
  dp: number;  // Change percent
  h: number;   // Day high
  l: number;   // Day low
  o: number;   // Open
  pc: number;  // Previous close
  t: number;   // Unix timestamp
}

// Alpha Vantage GLOBAL_QUOTE response
interface AlphaVantageQuoteResponse {
  'Global Quote': {
    '01. symbol': string;
    '02. open': string;
    '03. high': string;
    '04. low': string;
    '05. price': string;
    '06. volume': string;
    '08. previous close': string;
    '09. change': string;
    '10. change percent': string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class QuoteService {
  // In-memory cache
  private readonly _quotesCache = signal<Record<string, Quote>>({});
  private readonly _lastUpdated = signal<string | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  // Public readonly signals
  readonly quotes = this._quotesCache.asReadonly();
  readonly lastUpdated = this._lastUpdated.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  /** Minutes since last successful quote fetch. Null if never fetched. */
  readonly cacheAgeMinutes = computed<number | null>(() => {
    const lastUpdated = this._lastUpdated();
    if (!lastUpdated) return null;
    return Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 60000);
  });

  /** True when cached data is older than 1 hour */
  readonly isStaleCache = computed(() => {
    const age = this.cacheAgeMinutes();
    return age !== null && age > 60;
  });

  // Observable for subscribers
  private quotesSubject = new BehaviorSubject<Record<string, Quote>>({});
  readonly quotes$ = this.quotesSubject.asObservable();

  constructor(
    private http: HttpClient,
    private storage: StorageService,
    private settingsService: SettingsService,
    private networkStatus: NetworkStatusService
  ) {
    this.loadCachedQuotes();
  }

  /**
   * Load quotes from storage cache
   */
  private loadCachedQuotes(): void {
    const cache = this.storage.get<QuoteCache>('dh_quote_cache');
    if (!cache?.quotes) return;

    const currentSource = this.settingsService.settings().quoteDataSource;
    // Don't pre-load cache if it was built with a different data source
    if (cache.dataSource && cache.dataSource !== currentSource) return;

    this._quotesCache.set(cache.quotes);
    this._lastUpdated.set(cache.lastUpdated);
    this.quotesSubject.next(cache.quotes);
  }

  /**
   * Get quote for a symbol
   */
  getQuote(symbol: string): Quote | undefined {
    return this._quotesCache()[symbol];
  }

  /**
   * Get quotes for multiple symbols (from cache)
   */
  getQuotes(symbols: string[]): Record<string, Quote> {
    const cache = this._quotesCache();
    const result: Record<string, Quote> = {};
    symbols.forEach(s => {
      if (cache[s]) result[s] = cache[s];
    });
    return result;
  }

  /**
   * Check if cache is valid based on TTL
   */
  isCacheValid(): boolean {
    const lastUpdated = this._lastUpdated();
    if (!lastUpdated) return false;

    const settings = this.settingsService.settings();

    // Invalidate if the stored cache was from a different data source
    const storedCache = this.storage.get<QuoteCache>('dh_quote_cache');
    if (storedCache?.dataSource && storedCache.dataSource !== settings.quoteDataSource) {
      return false;
    }

    const ttl = settings.cacheTTLSeconds * 1000;
    const age = Date.now() - new Date(lastUpdated).getTime();
    return age < ttl;
  }

  /**
   * Fetch quotes from API (Yahoo Finance or mock data)
   */
  fetchQuotes(symbols: string[], bypassCache = false): Observable<Record<string, Quote>> {
    // If offline, serve cache immediately — no network attempt
    if (this.networkStatus.isOffline()) {
      this._isLoading.set(false);
      this._error.set(null); // Not an error — offline banner handles the messaging
      return of(this.getQuotes(symbols));
    }

    // If cache valid and not bypassing, return cached data
    if (!bypassCache && this.isCacheValid()) {
      return of(this.getQuotes(symbols));
    }

    this._isLoading.set(true);
    this._error.set(null);

    const settings = this.settingsService.settings();

    // Route to correct data source.
    // finnhub and alphavantage use the same Netlify proxy as yahoo —
    // the server automatically picks the right API based on which env var is set.
    // Direct client-side Finnhub/AV calls are only used for self-hosted setups
    // where a user explicitly provides their own key in Settings.
    const source = settings.quoteDataSource;
    const hasClientFinnhubKey = !!(settings.finnhubApiKey);
    const hasClientAVKey = !!(settings.alphaVantageApiKey);

    const fetchObservable =
      source === 'finnhub'      && hasClientFinnhubKey ? this.fetchFromFinnhub(symbols) :
      source === 'alphavantage' && hasClientAVKey       ? this.fetchFromAlphaVantage(symbols) :
      source === 'mock'                                 ? this.generateMockQuotes(symbols) :
      source === 'yahoo'                                ? this.fetchFromYahooFinance(symbols, 'yahoo') :
                                                         this.fetchFromYahooFinance(symbols, source);

    return fetchObservable.pipe(
      tap(quotes => {
        this.updateCache(quotes);
        this._isLoading.set(false);
      }),
      catchError(err => {
        console.error('Quote fetch error:', err);
        this._error.set('Failed to fetch quotes. Using cached data.');
        this._isLoading.set(false);
        // Return cached data on error
        return of(this.getQuotes(symbols));
      })
    );
  }

  /**
   * Fetch quotes from Yahoo Finance API via batch endpoint
   */
  private fetchFromYahooFinance(symbols: string[], sourceHint = 'yahoo'): Observable<Record<string, Quote>> {
    const settings = this.settingsService.settings();
    // Empty string = same origin (Netlify). Explicit URL = external proxy or local dev server.
    const baseUrl = settings.yahooProxyUrl ?? '';
    const now = new Date().toISOString();

    // If no symbols, return empty
    if (!symbols || symbols.length === 0) {
      return of({});
    }

    // Build batch request with .NS suffix for NSE stocks
    const yahooSymbols = symbols.map(s => `${s}.NS`).join(',');
    // Use /.netlify/functions/quotes directly to avoid SPA catch-all redirect swallowing the request
    const functionPath = baseUrl ? `${baseUrl}/api/quotes` : '/.netlify/functions/quotes';
    const url = `${functionPath}?symbols=${encodeURIComponent(yahooSymbols)}&source=${encodeURIComponent(sourceHint)}`;

    return this.http.get<BatchQuotesResponse>(url).pipe(
      map(response => {
        const quotes: Record<string, Quote> = {};

        Object.entries(response.quotes ?? {}).forEach(([yahooSymbol, data]) => {
          const symbol = data.symbol; // Already stripped of .NS
          quotes[symbol] = {
            symbol,
            price: data.price,
            currency: data.currency || 'INR',
            change: data.change,
            changePercent: data.changePercent,
            previousClose: data.previousClose,
            dayHigh: data.dayHigh,
            dayLow: data.dayLow,
            volume: data.volume,
            fiftyTwoWeekHigh: data.fiftyTwoWeekHigh,
            fiftyTwoWeekLow: data.fiftyTwoWeekLow,
            timestamp: data.timestamp,
            source: sourceHint as Quote['source']
          };
        });

        // Server returned no quotes (all symbols failed or API error returned HTTP 200).
        // Throw so catchError falls back to mock data instead of caching empty results.
        if (Object.keys(quotes).length === 0) {
          const errDetail = response.errors?.map(e => e.error ?? e.symbol).join(', ') ?? 'unknown';
          throw new Error(`Server returned 0 quotes. Errors: ${errDetail}`);
        }

        return quotes;
      }),
      catchError(err => {
        console.error('[QuoteService] Batch fetch failed:', err);
        return this.generateMockQuotes(symbols);
      })
    );
  }

  /**
   * Fetch quotes from Finnhub via parallel individual requests
   * Indian NSE stocks: SYMBOL.NS format
   * Free tier: 60 req/min — no credit card required
   */
  private fetchFromFinnhub(symbols: string[]): Observable<Record<string, Quote>> {
    const apiKey = this.settingsService.settings().finnhubApiKey ?? '';
    if (!apiKey) return this.generateMockQuotes(symbols);

    const requests = symbols.map(symbol =>
      this.http.get<FinnhubQuoteResponse>(
        // Finnhub uses exchange-prefixed format: NSE:RELIANCE (not RELIANCE.NS)
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent('NSE:' + symbol)}&token=${encodeURIComponent(apiKey)}`
      ).pipe(
        map(data => ({ symbol, data })),
        catchError(() => of({ symbol, data: null as FinnhubQuoteResponse | null }))
      )
    );

    return forkJoin(requests).pipe(
      map(results => {
        const quotes: Record<string, Quote> = {};
        const now = new Date().toISOString();

        results.forEach(({ symbol, data }) => {
          // data.c === 0 means market closed — use previous close (pc) as price
          if (data && (data.c > 0 || data.pc > 0)) {
            const marketOpen = data.c > 0;
            quotes[symbol] = {
              symbol,
              price: marketOpen ? data.c : data.pc,
              currency: 'INR',
              change: marketOpen ? (data.d ?? 0) : 0,
              changePercent: marketOpen ? (data.dp ?? 0) : 0,
              previousClose: data.pc,
              dayHigh: data.h,
              dayLow: data.l,
              open: data.o,
              timestamp: now,
              source: 'finnhub'
            };
          }
        });

        // Partial mock fallback for symbols with no data (market closed, unknown symbol, etc.)
        const missing = symbols.filter(s => !quotes[s]);
        if (missing.length > 0) {
          Object.assign(quotes, this.buildMockQuotes(missing));
        }

        return quotes;
      })
    );
  }

  /**
   * Fetch quotes from Alpha Vantage via parallel individual requests
   * Indian BSE stocks: SYMBOL.BSE format
   * Free tier: 25 req/day — suitable for small watchlists only
   */
  private fetchFromAlphaVantage(symbols: string[]): Observable<Record<string, Quote>> {
    const apiKey = this.settingsService.settings().alphaVantageApiKey ?? '';
    if (!apiKey) return this.generateMockQuotes(symbols);

    const requests = symbols.map(symbol =>
      this.http.get<AlphaVantageQuoteResponse>(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol + '.BSE')}&apikey=${encodeURIComponent(apiKey)}`
      ).pipe(
        map(data => ({ symbol, data })),
        catchError(() => of({ symbol, data: null as AlphaVantageQuoteResponse | null }))
      )
    );

    return forkJoin(requests).pipe(
      map(results => {
        const quotes: Record<string, Quote> = {};
        const now = new Date().toISOString();

        results.forEach(({ symbol, data }) => {
          const q = data?.['Global Quote'];
          const price = q ? parseFloat(q['05. price']) : 0;
          if (q && price > 0) {
            const changePercent = parseFloat(q['10. change percent'].replace('%', '').trim());
            quotes[symbol] = {
              symbol,
              price,
              currency: 'INR',
              change: parseFloat(q['09. change']),
              changePercent: isNaN(changePercent) ? 0 : changePercent,
              previousClose: parseFloat(q['08. previous close']),
              dayHigh: parseFloat(q['03. high']),
              dayLow: parseFloat(q['04. low']),
              open: parseFloat(q['02. open']),
              timestamp: now,
              source: 'alphavantage'
            };
          }
        });

        const missing = symbols.filter(s => !quotes[s]);
        if (missing.length > 0) {
          Object.assign(quotes, this.buildMockQuotes(missing));
        }

        return quotes;
      })
    );
  }

  /**
   * Refresh quotes (force bypass cache)
   */
  refresh(symbols: string[]): Observable<Record<string, Quote>> {
    return this.fetchQuotes(symbols, true);
  }

  /**
   * Update cache with new quotes
   */
  private updateCache(quotes: Record<string, Quote>): void {
    // Don't overwrite a valid cache with empty data or update the "last fetched" timestamp.
    // An empty result means the fetch failed silently — next load should retry.
    if (Object.keys(quotes).length === 0) return;

    const now = new Date().toISOString();
    const merged = { ...this._quotesCache(), ...quotes };
    
    this._quotesCache.set(merged);
    this._lastUpdated.set(now);
    this.quotesSubject.next(merged);

    // Persist to storage
    const settings = this.settingsService.settings();
    const cache: QuoteCache = {
      quotes: merged,
      lastUpdated: now,
      ttlSeconds: settings.cacheTTLSeconds,
      dataSource: settings.quoteDataSource
    };
    this.storage.set('dh_quote_cache', cache);
  }

  /**
   * Build mock quotes synchronously — used directly and as partial fallback
   */
  private buildMockQuotes(symbols: string[]): Record<string, Quote> {
    const quotes: Record<string, Quote> = {};
    const now = new Date().toISOString();
    symbols.forEach(symbol => {
      const basePrice = this.getBasePriceForSymbol(symbol);
      const changePercent = (Math.random() - 0.5) * 6; // -3% to +3%
      const change = basePrice * (changePercent / 100);
      quotes[symbol] = {
        symbol,
        price: Number((basePrice + change).toFixed(2)),
        currency: 'INR',
        change: Number(change.toFixed(2)),
        changePercent: Number(changePercent.toFixed(2)),
        previousClose: basePrice,
        timestamp: now,
        source: 'mock'
      };
    });
    return quotes;
  }

  /**
   * Generate mock quotes as Observable — used when mock is the selected source
   */
  private generateMockQuotes(symbols: string[]): Observable<Record<string, Quote>> {
    return of(this.buildMockQuotes(symbols));
  }

  /**
   * Get base price for symbol (mock data)
   */
  private getBasePriceForSymbol(symbol: string): number {
    const prices: Record<string, number> = {
      'RELIANCE': 2450,
      'HDFCBANK': 1650,
      'ICICIBANK': 1050,
      'TCS': 3800,
      'INFY': 1500,
      'BHARTIARTL': 1100,
      'HAL': 4200,
      'LT': 3500,
      'ADANIPORTS': 1200,
      'ITC': 450,
      'BAJFINANCE': 6800,
      'SUNPHARMA': 1600,
      'TITAN': 3200,
      'NTPC': 350,
      'ULTRACEMCO': 10500,
      'ASIANPAINT': 2800,
      'MARUTI': 11500,
      'M&M': 2900,
      'PERSISTENT': 5200,
      'AFFLE': 1350,
      'VEDL': 450,
      'COALINDIA': 420,
      'CASTROLIND': 210,
      'ONGC': 280,
      'POWERGRID': 310,
      'RECLTD': 520,
      'PFC': 480,
      'WIPRO': 480
    };
    return prices[symbol] || 1000;
  }

  /**
   * Clear quote cache
   */
  clearCache(): void {
    this._quotesCache.set({});
    this._lastUpdated.set(null);
    this.quotesSubject.next({});
    this.storage.remove('dh_quote_cache');
  }
}
