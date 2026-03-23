/**
 * Quote Model - Represents real-time stock price data
 * Supports Yahoo Finance API and mock data sources
 */

export interface Quote {
  symbol: string;
  price: number;
  currency: 'INR' | string;
  change: number;
  changePercent: number;
  open?: number;
  high?: number;
  low?: number;
  dayHigh?: number;      // From Yahoo Finance
  dayLow?: number;       // From Yahoo Finance
  previousClose?: number;
  volume?: number;
  fiftyTwoWeekHigh?: number;  // From Yahoo Finance
  fiftyTwoWeekLow?: number;   // From Yahoo Finance
  timestamp: string;
  source: 'yahoo' | 'mock' | string;
}

export interface QuoteResponse {
  timestamp: string;
  source: string;
  quotes: Quote[];
}

export interface QuoteCache {
  quotes: Record<string, Quote>;
  lastUpdated: string;
  ttlSeconds: number;
  dataSource?: string; // Track which source populated this cache
}
