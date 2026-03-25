/**
 * Settings Model - Application configuration
 */

import { CurrencyCode } from './currency.model';

export type RedRuleType = 'CHANGE_PERCENT_NEGATIVE' | 'CHANGE_PERCENT_THRESHOLD' | 'BELOW_SMA';
export type QuoteDataSource = 'mock' | 'yahoo' | 'finnhub' | 'alphavantage';

export interface RedRule {
  type: RedRuleType;
  threshold?: number;  // For CHANGE_PERCENT_THRESHOLD
  smaPeriod?: number;  // For BELOW_SMA (future)
}

export interface AppSettings {
  // Red condition rule
  redRule: RedRule;

  // Quote data source
  quoteDataSource: QuoteDataSource;
  yahooProxyUrl: string;       // CORS proxy URL for Yahoo Finance
  finnhubApiKey?: string;       // Finnhub API key (free at finnhub.io/register)
  alphaVantageApiKey?: string;  // Alpha Vantage API key (free at alphavantage.co/support)

  // Quote refresh settings
  autoRefresh: boolean;
  refreshIntervalSeconds: number;
  cacheTTLSeconds: number;

  // Display preferences
  defaultFolderId: 'GROWTH_20' | 'DIVIDEND_10';
  showHoldingsInDashboard: boolean;
  compactMode: boolean;

  // Display currency
  displayCurrency: CurrencyCode;

  // Planner defaults
  defaultAllocationStrategy: 'EQUAL_WEIGHT' | 'CUSTOM_WEIGHT';

  // Price alerts: symbol → threshold changePercent (e.g. -3 means alert when drop >= 3%)
  priceAlerts: Record<string, number>;

  // Timestamps
  updatedAt: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  redRule: {
    type: 'CHANGE_PERCENT_NEGATIVE'
  },
  quoteDataSource: 'mock',  // Change to 'yahoo' in Settings page to use real data
  yahooProxyUrl: '',  // Empty = same origin (/api/quotes). Set full URL for external proxy.
  autoRefresh: false,
  refreshIntervalSeconds: 900,  // 15 minutes (Yahoo Finance refresh rate)
  cacheTTLSeconds: 900,  // 15 minutes to match Yahoo Finance delay
  defaultFolderId: 'GROWTH_20',
  showHoldingsInDashboard: true,
  compactMode: false,
  displayCurrency: 'INR',
  defaultAllocationStrategy: 'EQUAL_WEIGHT',
  priceAlerts: {},
  updatedAt: new Date().toISOString()
};
