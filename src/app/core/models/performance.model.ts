/**
 * Performance Models - Historical stock performance data
 */

/**
 * Supported time ranges for performance data
 */
export type HistoryRange = '1W' | '30D' | '1M' | '3M' | '6M' | '5Y';

/**
 * A single historical price point
 */
export interface HistoricalPoint {
  date: string;    // ISO date string: YYYY-MM-DD
  close: number;   // Closing price
}

/**
 * Response from history API
 */
export interface HistoryResponse {
  symbol: string;
  range: HistoryRange;
  currency: string;
  points: HistoricalPoint[];
}

/**
 * Performance summary calculated from history data
 */
export interface PerformanceSummary {
  startPrice: number;
  endPrice: number;
  absoluteChange: number;
  percentageChange: number;
  highPrice: number;
  lowPrice: number;
  avgPrice: number;
}

/**
 * Time range option for UI
 */
export interface TimeRangeOption {
  value: HistoryRange;
  label: string;
  days: number;
}

/**
 * Default time range options
 */
export const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { value: '1W', label: '1W', days: 7 },
  { value: '30D', label: '30D', days: 30 },
  { value: '1M', label: '1M', days: 30 },
  { value: '3M', label: '3M', days: 90 },
  { value: '6M', label: '6M', days: 180 },
  { value: '5Y', label: '5Y', days: 1825 }
];

/**
 * Stock selection for comparison
 */
export interface StockComparison {
  stockId: string;
  symbol: string;
  displayName: string;
  color: string;
  data: HistoricalPoint[];
  summary: PerformanceSummary | null;
}

/**
 * Cached history entry
 */
export interface CachedHistory {
  data: HistoryResponse;
  timestamp: number;
  expiresAt: number;
}
