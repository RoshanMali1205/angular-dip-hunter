/**
 * Stock Analysis Service
 * Provides detailed AI insights for individual stocks
 */

import { Injectable, computed, inject } from '@angular/core';
import { QuoteService } from './quote.service';
import { HoldingsService } from './holdings.service';
import { PortfolioService } from './portfolio.service';

export interface StockAnalysis {
  symbol: string;
  displayName: string;
  currentPrice: number;
  priceChange: number;
  changePercent: number;
  
  analysis: {
    dropType: 'technical' | 'sector-wide' | 'news-based' | 'correction' | 'unknown';
    explanation: string;
    supportingFactors: string[];
    riskLevel: 'low' | 'medium' | 'high';
    recommendation: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class StockAnalysisService {
  private quoteService = inject(QuoteService);
  private holdingsService = inject(HoldingsService);
  private portfolioService = inject(PortfolioService);

  /**
   * Analyze a red stock to determine drop cause
   */
  analyzeRedStock(symbol: string): StockAnalysis {
    const quotes = this.quoteService.quotes();
    const quote = quotes[symbol];
    const holdings = this.holdingsService.holdings();
    const holding = holdings.find(h => h.symbol === symbol);
    const stock = this.portfolioService.stocks().find((s: any) => s.symbol === symbol) as any;

    const changePercent = quote?.changePercent ?? 0;
    const priceChange = quote?.change ?? 0;

    // Determine drop type and generate analysis
    const analysis = this.determineDropType(
      symbol,
      changePercent,
      stock?.sector,
      quotes
    );

    return {
      symbol,
      displayName: stock?.displayName ?? symbol,
      currentPrice: quote?.price ?? 0,
      priceChange,
      changePercent,
      analysis
    };
  }

  /**
   * Determine root cause of price drop
   */
  private determineDropType(
    symbol: string,
    changePercent: number,
    sector?: string,
    allQuotes?: Record<string, any>
  ) {
    const absChange = Math.abs(changePercent);

    // 1. Check if sector-wide (other stocks in same sector also down)
    const sectorAnalysis = this.analyzeSectorTrend(sector, symbol, allQuotes);
    if (sectorAnalysis.isSectorWide) {
      return {
        dropType: 'sector-wide' as const,
        explanation: `This is a sector-wide movement. ${sectorAnalysis.message}`,
        supportingFactors: [
          `${sectorAnalysis.downCount} other stocks in ${sector} are also down`,
          'Drop is synchronized across sector',
          'Individual company fundamentals may be intact'
        ],
        riskLevel: 'medium' as const,
        recommendation: `${sector} sector is under pressure. Monitor 2-3 weeks. If sector recovers, ${symbol} likely will too.`
      };
    }

    // 2. Check if technical/temporary correction (shallow drop)
    if (absChange < 5) {
      return {
        dropType: 'correction' as const,
        explanation: `Minor pullback of ${changePercent.toFixed(1)}%. This is a normal technical correction.`,
        supportingFactors: [
          'Drop is within normal daily volatility range',
          'Could be profit-taking after gains',
          'Typical support/resistance test'
        ],
        riskLevel: 'low' as const,
        recommendation: `Consider this a buying opportunity if fundamentals are strong. Monitor support levels.`
      };
    }

    // 3. Check if sharp drop (likely news-based)
    if (absChange >= 10) {
      return {
        dropType: 'news-based' as const,
        explanation: `Sharp drop of ${changePercent.toFixed(1)}% indicates significant news event or earnings miss.`,
        supportingFactors: [
          'Drop magnitude suggests news-driven move',
          'Likely earnings, regulatory, or competition news',
          'May create buying opportunity if overreacted'
        ],
        riskLevel: 'high' as const,
        recommendation: `Research latest news and earnings reports. Wait for stabilization (2-3 days) before averaging down.`
      };
    }

    // 4. Moderate drop (5-10%)
    return {
      dropType: 'technical' as const,
      explanation: `Moderate drop of ${changePercent.toFixed(1)}%. Could be technical or minor news impact.`,
      supportingFactors: [
        'Drop is between correction and sharp fall range',
        'Likely mixed technical and news factors',
        'Check 50/200-day moving average levels'
      ],
      riskLevel: 'medium' as const,
      recommendation: `Review technical support levels. Add if support holds, reduce if broken below 200-MA.`
    };
  }

  /**
   * Analyze if drop is sector-wide
   */
  private analyzeSectorTrend(
    sector: string | undefined,
    symbol: string,
    allQuotes?: Record<string, any>
  ) {
    if (!sector || !allQuotes) {
      return { isSectorWide: false, downCount: 0, message: '' };
    }

    const stocks = this.portfolioService.stocks();
    const sectorStocks = stocks.filter((s: any) => s.sector === sector && s.symbol !== symbol) as any[];
    
    if (sectorStocks.length === 0) {
      return { isSectorWide: false, downCount: 0, message: '' };
    }

    const downStocks = (sectorStocks as any[]).filter((s: any) => {
      const quote = allQuotes[s.symbol];
      return quote && quote.changePercent < 0;
    });

    const downPercentage = (downStocks.length / sectorStocks.length) * 100;
    const isSectorWide = downPercentage >= 50; // 50%+ of sector is down

    return {
      isSectorWide,
      downCount: downStocks.length,
      message: `${downStocks.length}/${sectorStocks.length} stocks in ${sector} are down`
    };
  }
}
