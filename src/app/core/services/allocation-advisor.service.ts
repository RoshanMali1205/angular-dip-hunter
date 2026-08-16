/**
 * Allocation Advisor Service
 * Heuristic strategies + optional Gemini-backed allocation via /api/ai
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { QuoteService } from './quote.service';
import { SettingsService } from './settings.service';
import { CurrencyService } from './currency.service';
import { StockViewModel } from '../models';
import {
  AdvisorStrategy,
  AiAllocateRequest,
  AiAllocateResponse,
  AllocationSuggestion,
} from '../models/plan.model';

export type { AdvisorStrategy, AllocationSuggestion };

@Injectable({
  providedIn: 'root'
})
export class AllocationAdvisorService {
  private quoteService = inject(QuoteService);
  private settingsService = inject(SettingsService);
  private currencyService = inject(CurrencyService);
  private http = inject(HttpClient);

  /**
   * Generate heuristic allocation suggestions for a budget across stocks
   */
  suggestAllocations(stocks: StockViewModel[], budget: number): AllocationSuggestion[] {
    if (stocks.length === 0 || budget <= 0) return [];

    return [
      this.generateEqualWeightAllocation(stocks, budget),
      this.generateRiskAdjustedAllocation(stocks, budget),
      this.generateDefensiveAllocation(stocks, budget)
    ];
  }

  /**
   * Ask Gemini (via serverless / local proxy) for a fourth allocation strategy.
   * Returns null when Gemini is unavailable or the request fails — heuristics still work offline.
   */
  fetchGeminiAllocation(
    stocks: StockViewModel[],
    budget: number
  ): Observable<AllocationSuggestion | null> {
    if (stocks.length === 0 || budget <= 0) {
      return of(null);
    }

    const body: AiAllocateRequest = {
      action: 'allocate',
      budget,
      currency: this.currencyService.displayCurrency(),
      stocks: stocks.map((s) => ({
        symbol: s.symbol,
        displayName: s.displayName,
        sector: s.sector,
        price: s.price,
        changePercent: s.changePercent,
        holdingQty: s.holdingQty,
      })),
    };

    return this.http.post<AiAllocateResponse>(this.aiEndpoint(), body).pipe(
      map((res) => this.normalizeGeminiSuggestion(res?.suggestion, stocks, budget)),
      catchError(() => of(null))
    );
  }

  private aiEndpoint(): string {
    const baseUrl = this.settingsService.settings().yahooProxyUrl ?? '';
    // Prefer /.netlify/functions/ai on same origin so SPA catch-all cannot swallow the request
    return baseUrl ? `${baseUrl}/api/ai` : '/.netlify/functions/ai';
  }

  private normalizeGeminiSuggestion(
    suggestion: AllocationSuggestion | undefined,
    stocks: StockViewModel[],
    budget: number
  ): AllocationSuggestion | null {
    if (!suggestion?.allocations?.length) return null;

    const bySymbol = new Map(stocks.map((s) => [s.symbol, s]));
    const allocations = suggestion.allocations
      .map((row) => {
        const stock = bySymbol.get(row.symbol);
        if (!stock) return null;
        const allocation = Number(row.allocation);
        if (!Number.isFinite(allocation) || allocation < 0) return null;
        return {
          symbol: stock.symbol,
          displayName: stock.displayName,
          allocation,
          percentage: budget > 0 ? (allocation / budget) * 100 : 0,
          reason: row.reason || 'Gemini suggestion',
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (allocations.length === 0) return null;

    return {
      strategy: 'gemini',
      name: suggestion.name || 'Gemini Advisor',
      description: suggestion.description || 'Gemini allocation for this month’s red candidates',
      rationale: suggestion.rationale || 'Model-weighted split across red candidates.',
      allocations,
      riskProfile: suggestion.riskProfile || 'balanced',
      expectedReturn: suggestion.expectedReturn || 'Model estimate only',
      provider: 'gemini',
      model: suggestion.model,
      disclaimer: suggestion.disclaimer || 'AI-assisted suggestion — not financial advice.',
    };
  }

  /**
   * Equal weight allocation - divide equally among all stocks
   */
  private generateEqualWeightAllocation(
    stocks: StockViewModel[],
    budget: number
  ): AllocationSuggestion {
    const allocation = budget / stocks.length;
    
    const allocations = stocks.map(stock => ({
      symbol: stock.symbol,
      displayName: stock.displayName,
      allocation,
      percentage: (allocation / budget) * 100,
      reason: 'Equal distribution'
    }));

    return {
      strategy: 'equal',
      name: 'Equal Weight',
      description: 'Divide budget equally across all red candidates',
      rationale: 'Simple, diversified approach. Good for beginners or balanced investors.',
      allocations,
      riskProfile: 'balanced',
      expectedReturn: '15-20% (if stocks recover)'
    };
  }

  /**
   * Risk-adjusted allocation - allocate more to lower volatility stocks
   */
  private generateRiskAdjustedAllocation(
    stocks: StockViewModel[],
    budget: number
  ): AllocationSuggestion {
    const quotes = this.quoteService.quotes();

    // Calculate volatility score (lower change % = lower volatility)
    const stocksWithVolatility = stocks.map(stock => {
      const quote = quotes[stock.symbol];
      const changePercent = Math.abs(quote?.changePercent ?? 0);
      const volatility = Math.max(0, 10 - changePercent); // Higher volatility = lower score
      return { stock, volatility };
    });

    const totalVolatility = stocksWithVolatility.reduce((sum, s) => sum + s.volatility, 0);
    
    const allocations = stocksWithVolatility.map(({ stock, volatility }) => {
      const percentage = (volatility / totalVolatility) * 100;
      const allocation = (percentage / 100) * budget;
      return {
        symbol: stock.symbol,
        displayName: stock.displayName,
        allocation,
        percentage,
        reason: `${percentage.toFixed(1)}% - Lower volatility = higher allocation`
      };
    });

    return {
      strategy: 'risk-adjusted',
      name: 'Risk-Adjusted',
      description: 'Higher allocation to more stable stocks',
      rationale: 'Allocate more to stocks with smaller drops. Better for risk-averse investors.',
      allocations,
      riskProfile: 'conservative',
      expectedReturn: '12-18% (defensive approach)'
    };
  }

  /**
   * Defensive allocation - favor defensive sectors
   */
  private generateDefensiveAllocation(
    stocks: StockViewModel[],
    budget: number
  ): AllocationSuggestion {
    // Defensive sectors: Pharma, FMCG, Utilities, Telecom, Banking
    const defensiveSectors = ['Pharma', 'FMCG', 'Power', 'Telecom', 'Banking', 'Healthcare'];
    
    // Categorize stocks
    const defensiveStocks = stocks.filter(s => 
      defensiveSectors.some(sector => s.sector?.includes(sector))
    );
    const growthStocks = stocks.filter(s => 
      !defensiveSectors.some(sector => s.sector?.includes(sector))
    );

    // Allocate 70% to defensive, 30% to growth
    const defensiveBudget = budget * 0.7;
    const growthBudget = budget * 0.3;

    const allocations: AllocationSuggestion['allocations'] = [];

    // Defensive stocks get more
    if (defensiveStocks.length > 0) {
      const defAllocation = defensiveBudget / defensiveStocks.length;
      defensiveStocks.forEach(stock => {
        allocations.push({
          symbol: stock.symbol,
          displayName: stock.displayName,
          allocation: defAllocation,
          percentage: (defAllocation / budget) * 100,
          reason: `${stock.sector} - Defensive sector (70% of budget)`
        });
      });
    }

    // Growth stocks get less
    if (growthStocks.length > 0) {
      const growthAllocation = growthBudget / growthStocks.length;
      growthStocks.forEach(stock => {
        allocations.push({
          symbol: stock.symbol,
          displayName: stock.displayName,
          allocation: growthAllocation,
          percentage: (growthAllocation / budget) * 100,
          reason: `${stock.sector} - Growth stock (30% of budget)`
        });
      });
    }

    // Fallback to equal if no stocks categorized
    if (allocations.length === 0) {
      return this.generateEqualWeightAllocation(stocks, budget);
    }

    return {
      strategy: 'defensive',
      name: 'Defensive Mode',
      description: '70% defensive sectors, 30% growth stocks',
      rationale: 'Focus on stable dividend stocks and defensive sectors. Best during market downturns.',
      allocations,
      riskProfile: 'conservative',
      expectedReturn: '10-15% (safe growth)'
    };
  }

  /**
   * Get recommendation based on market conditions
   */
  getRecommendation(stocks: StockViewModel[]): {
    strategy: AdvisorStrategy;
    reason: string;
  } {
    if (stocks.length === 0) {
      return {
        strategy: 'equal',
        reason: 'No stocks to analyze. Using equal weight as default.'
      };
    }

    const quotes = this.quoteService.quotes();
    const redCount = stocks.filter(s => {
      const quote = quotes[s.symbol];
      return (quote?.changePercent ?? 0) < 0;
    }).length;

    const redPercentage = (redCount / stocks.length) * 100;

    if (redPercentage > 70) {
      return {
        strategy: 'defensive',
        reason: '70%+ market is down. Defensive allocation reduces sector risk.'
      };
    }

    if (redPercentage >= 40) {
      return {
        strategy: 'risk-adjusted',
        reason: 'Mixed market. Focus on more stable stocks with smaller drops.'
      };
    }

    return {
      strategy: 'equal',
      reason: 'Market is relatively strong. Equal weight captures broad opportunities.'
    };
  }
}
