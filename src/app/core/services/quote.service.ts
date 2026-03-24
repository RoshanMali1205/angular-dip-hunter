/**
 * Quote Service - Fetch and cache stock quotes
 * Supports Yahoo Finance API with CORS proxy or mock data
 */

import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map, tap, BehaviorSubject } from 'rxjs';
import { Quote, QuoteCache } from '../models/quote.model';
import { StorageService } from './storage.service';
import { SettingsService } from './settings.service';

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

  // Observable for subscribers
  private quotesSubject = new BehaviorSubject<Record<string, Quote>>({});
  readonly quotes$ = this.quotesSubject.asObservable();

  constructor(
    private http: HttpClient,
    private storage: StorageService,
    private settingsService: SettingsService
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
    // If cache valid and not bypassing, return cached data
    if (!bypassCache && this.isCacheValid()) {
      return of(this.getQuotes(symbols));
    }

    this._isLoading.set(true);
    this._error.set(null);

    const settings = this.settingsService.settings();

    // Choose data source based on settings
    const fetchObservable = settings.quoteDataSource === 'yahoo'
      ? this.fetchFromYahooFinance(symbols)
      : this.generateMockQuotes(symbols);

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
  private fetchFromYahooFinance(symbols: string[]): Observable<Record<string, Quote>> {
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
    const url = `${functionPath}?symbols=${encodeURIComponent(yahooSymbols)}`;

    return this.http.get<BatchQuotesResponse>(url).pipe(
      map(response => {
        
        const quotes: Record<string, Quote> = {};
        
        Object.entries(response.quotes).forEach(([yahooSymbol, data]) => {
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
            source: 'yahoo'
          };
        });
        
        return quotes;
      }),
      catchError(err => {
        console.error('[QuoteService] Batch fetch failed:', err);
        // Fallback to mock data
        return this.generateMockQuotes(symbols);
      })
    );
  }

  /**
   * Generate a single mock quote for a symbol (fallback)
   */
  private generateMockQuoteForSymbol(symbol: string, timestamp: string): Quote {
    const basePrice = this.getBasePriceForSymbol(symbol);
    const changePercent = (Math.random() - 0.5) * 6;
    const change = basePrice * (changePercent / 100);
    
    return {
      symbol,
      price: Number((basePrice + change).toFixed(2)),
      currency: 'INR',
      change: Number(change.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      previousClose: basePrice,
      timestamp,
      source: 'mock'
    };
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
   * Generate mock quotes for development/MVP
   */
  private generateMockQuotes(symbols: string[]): Observable<Record<string, Quote>> {
    const quotes: Record<string, Quote> = {};
    const now = new Date().toISOString();

    symbols.forEach(symbol => {
      // Generate realistic mock data
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

    // Simulate network delay
    return of(quotes);
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
