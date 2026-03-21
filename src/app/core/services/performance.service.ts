/**
 * Performance Service - Fetch and cache historical stock performance data
 */

import { Injectable, signal, computed } from '@angular/core';
import { 
  HistoryRange, 
  HistoricalPoint, 
  HistoryResponse, 
  PerformanceSummary,
  CachedHistory,
  TIME_RANGE_OPTIONS
} from '../models/performance.model';

@Injectable({
  providedIn: 'root'
})
export class PerformanceService {
  private readonly CACHE_KEY_PREFIX = 'dh_history_';
  private readonly CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours in ms
  
  // Loading state
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);
  
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  
  /**
   * Get historical data for a symbol and range
   * Returns cached data if available and not expired
   */
  async getHistory(symbol: string, range: HistoryRange): Promise<HistoryResponse | null> {
    const cacheKey = this.getCacheKey(symbol, range);
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch from "API" (mock data for now)
    this._isLoading.set(true);
    this._error.set(null);
    
    try {
      // Simulate API delay
      await this.delay(500);
      
      // Generate mock data
      const data = this.generateMockHistory(symbol, range);
      
      // Cache the result
      this.saveToCache(cacheKey, data);
      
      return data;
    } catch (err) {
      this._error.set('Failed to fetch performance data');
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }
  
  /**
   * Get history for multiple symbols
   */
  async getMultipleHistory(
    symbols: string[], 
    range: HistoryRange
  ): Promise<Map<string, HistoryResponse>> {
    const results = new Map<string, HistoryResponse>();
    
    this._isLoading.set(true);
    this._error.set(null);
    
    try {
      const promises = symbols.map(async (symbol) => {
        const data = await this.getHistory(symbol, range);
        if (data) {
          results.set(symbol, data);
        }
      });
      
      await Promise.all(promises);
      return results;
    } finally {
      this._isLoading.set(false);
    }
  }
  
  /**
   * Calculate performance summary from historical points
   */
  calculateSummary(points: HistoricalPoint[]): PerformanceSummary | null {
    if (!points || points.length === 0) {
      return null;
    }
    
    const startPrice = points[0].close;
    const endPrice = points[points.length - 1].close;
    const absoluteChange = endPrice - startPrice;
    const percentageChange = startPrice > 0 ? (absoluteChange / startPrice) * 100 : 0;
    
    const prices = points.map(p => p.close);
    const highPrice = Math.max(...prices);
    const lowPrice = Math.min(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    return {
      startPrice,
      endPrice,
      absoluteChange,
      percentageChange,
      highPrice,
      lowPrice,
      avgPrice
    };
  }
  
  /**
   * Calculate aggregate performance (equal-weight average)
   */
  calculateAggregatePerformance(
    historyMap: Map<string, HistoryResponse>
  ): HistoricalPoint[] {
    if (historyMap.size === 0) return [];
    
    // Get all unique dates
    const allDates = new Set<string>();
    historyMap.forEach(history => {
      history.points.forEach(p => allDates.add(p.date));
    });
    
    const sortedDates = Array.from(allDates).sort();
    
    // Calculate equal-weight average for each date
    return sortedDates.map(date => {
      let sum = 0;
      let count = 0;
      
      historyMap.forEach(history => {
        const point = history.points.find(p => p.date === date);
        if (point) {
          sum += point.close;
          count++;
        }
      });
      
      return {
        date,
        close: count > 0 ? sum / count : 0
      };
    });
  }
  
  /**
   * Normalize prices to percentage change from start
   * Useful for comparing stocks with different price levels
   */
  normalizeToPercentage(points: HistoricalPoint[]): HistoricalPoint[] {
    if (!points || points.length === 0) return [];
    
    const startPrice = points[0].close;
    
    return points.map(p => ({
      date: p.date,
      close: startPrice > 0 ? ((p.close - startPrice) / startPrice) * 100 : 0
    }));
  }
  
  /**
   * Clear cache for a specific symbol/range or all cache
   */
  clearCache(symbol?: string, range?: HistoryRange): void {
    if (symbol && range) {
      const cacheKey = this.getCacheKey(symbol, range);
      localStorage.removeItem(cacheKey);
    } else {
      // Clear all history cache
      const keys = Object.keys(localStorage).filter(k => k.startsWith(this.CACHE_KEY_PREFIX));
      keys.forEach(k => localStorage.removeItem(k));
    }
  }
  
  // Private helpers
  
  private getCacheKey(symbol: string, range: HistoryRange): string {
    return `${this.CACHE_KEY_PREFIX}${symbol}_${range}`;
  }
  
  private getFromCache(cacheKey: string): HistoryResponse | null {
    try {
      const item = localStorage.getItem(cacheKey);
      if (!item) return null;
      
      const cached: CachedHistory = JSON.parse(item);
      
      if (cached && Date.now() < cached.expiresAt) {
        return cached.data;
      }
      
      // Expired
      localStorage.removeItem(cacheKey);
      return null;
    } catch {
      return null;
    }
  }
  
  private saveToCache(cacheKey: string, data: HistoryResponse): void {
    const cached: CachedHistory = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.CACHE_TTL
    };
    
    try {
      localStorage.setItem(cacheKey, JSON.stringify(cached));
    } catch {
      // Ignore storage errors
    }
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Generate mock historical data for a symbol
   * In production, this would be replaced with actual API call
   */
  private generateMockHistory(symbol: string, range: HistoryRange): HistoryResponse {
    const option = TIME_RANGE_OPTIONS.find(o => o.value === range);
    const days = option?.days || 30;
    
    // Use symbol hash to generate consistent but varied data
    const symbolHash = this.hashCode(symbol);
    const basePrice = 500 + (symbolHash % 3000); // Base price between 500-3500
    const volatility = 0.02 + (symbolHash % 100) / 2000; // 2-7% volatility
    const trend = ((symbolHash % 200) - 100) / 10000; // -1% to +1% daily trend
    
    const points: HistoricalPoint[] = [];
    const endDate = new Date();
    let currentPrice = basePrice;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) {
        continue;
      }
      
      // Random walk with trend
      const randomChange = (Math.random() - 0.5) * 2 * volatility;
      currentPrice = currentPrice * (1 + randomChange + trend);
      
      // Ensure price doesn't go negative
      currentPrice = Math.max(currentPrice, 10);
      
      points.push({
        date: date.toISOString().split('T')[0],
        close: Math.round(currentPrice * 100) / 100
      });
    }
    
    return {
      symbol,
      range,
      currency: 'INR',
      points
    };
  }
  
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}
