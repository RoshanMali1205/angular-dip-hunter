/**
 * Stock Analysis Service
 * Heuristic red-stock insights plus optional Gemini dip ranking via /api/ai
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { QuoteService } from './quote.service';
import { PortfolioService } from './portfolio.service';
import { SettingsService } from './settings.service';
import { CurrencyService } from './currency.service';
import { StockViewModel } from '../models';
import {
  AiPredictRequest,
  AiPredictResponse,
  DipAction,
  DipConfidence,
  DipDropType,
  DipMarketTone,
  DipPick,
  DipPrediction,
} from '../models/plan.model';
import { resolveAiEndpoint } from '../utils/ai-endpoint';

export interface StockAnalysis {
  symbol: string;
  displayName: string;
  currentPrice: number;
  priceChange: number;
  changePercent: number;

  analysis: {
    dropType: DipDropType;
    explanation: string;
    supportingFactors: string[];
    riskLevel: 'low' | 'medium' | 'high';
    recommendation: string;
  };
}

const LOCAL_DISCLAIMER = 'Local ranking from price/sector heuristics — not financial advice.';
const GEMINI_DISCLAIMER = 'AI-assisted suggestion — not financial advice.';

@Injectable({
  providedIn: 'root'
})
export class StockAnalysisService {
  private quoteService = inject(QuoteService);
  private portfolioService = inject(PortfolioService);
  private settingsService = inject(SettingsService);
  private currencyService = inject(CurrencyService);
  private http = inject(HttpClient);

  /**
   * Analyze a red stock to determine drop cause
   */
  analyzeRedStock(symbol: string): StockAnalysis {
    const quotes = this.quoteService.quotes();
    const quote = quotes[symbol];
    const stock = this.portfolioService.stocks().find((s: any) => s.symbol === symbol) as any;

    const changePercent = quote?.changePercent ?? 0;
    const priceChange = quote?.change ?? 0;

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
   * Local dip ranking used immediately and as a Gemini fallback.
   */
  predictDips(stocks: StockViewModel[]): DipPrediction {
    if (stocks.length === 0) {
      return {
        summary: 'No red candidates to rank.',
        marketTone: 'cautious',
        picks: [],
        provider: 'local',
        disclaimer: LOCAL_DISCLAIMER,
      };
    }

    const quotes = this.quoteService.quotes();
    const picks = stocks
      .map((stock) => this.buildHeuristicPick(stock, quotes))
      .sort((a, b) => b.score - a.score);

    return {
      summary: this.summarizeLocalPicks(picks),
      marketTone: this.inferMarketTone(picks),
      picks,
      provider: 'local',
      disclaimer: LOCAL_DISCLAIMER,
    };
  }

  /**
   * Ask Gemini to rank red candidates. Returns null when unavailable so callers
   * can keep showing the local heuristic ranking.
   */
  fetchGeminiDipPredictions(stocks: StockViewModel[]): Observable<DipPrediction | null> {
    if (stocks.length === 0) {
      return of(null);
    }

    const body: AiPredictRequest = {
      action: 'predict',
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

    return this.http.post<AiPredictResponse>(
      resolveAiEndpoint(this.settingsService.settings().yahooProxyUrl),
      body
    ).pipe(
      map((res) => this.normalizeGeminiPrediction(res?.prediction, stocks)),
      catchError(() => of(null))
    );
  }

  private normalizeGeminiPrediction(
    prediction: DipPrediction | undefined,
    stocks: StockViewModel[]
  ): DipPrediction | null {
    if (!prediction?.picks?.length) return null;

    const bySymbol = new Map(stocks.map((s) => [s.symbol, s]));
    const seen = new Set<string>();
    const picks: DipPick[] = [];

    for (const row of prediction.picks) {
      const stock = bySymbol.get(row.symbol);
      if (!stock || seen.has(stock.symbol)) continue;
      seen.add(stock.symbol);
      picks.push({
        symbol: stock.symbol,
        displayName: stock.displayName,
        score: this.clampScore(row.score),
        action: this.asAction(row.action),
        confidence: this.asConfidence(row.confidence),
        dropType: this.asDropType(row.dropType),
        rationale: row.rationale || 'Gemini dip ranking',
        riskNote: row.riskNote || 'Model estimate only',
      });
    }

    if (picks.length === 0) return null;

    const localFallback = this.predictDips(stocks);
    for (const stock of stocks) {
      if (seen.has(stock.symbol)) continue;
      const fallback = localFallback.picks.find((p) => p.symbol === stock.symbol);
      if (fallback) picks.push(fallback);
    }

    picks.sort((a, b) => b.score - a.score);

    return {
      summary: prediction.summary || 'Gemini ranked today’s red candidates by dip quality.',
      marketTone: this.asMarketTone(prediction.marketTone),
      picks,
      provider: 'gemini',
      model: prediction.model,
      disclaimer: prediction.disclaimer || GEMINI_DISCLAIMER,
    };
  }

  private buildHeuristicPick(
    stock: StockViewModel,
    quotes: Record<string, { changePercent?: number }>
  ): DipPick {
    const changePercent = stock.changePercent ?? 0;
    const absChange = Math.abs(changePercent);
    const sectorWide = this.analyzeSectorTrend(stock.sector, stock.symbol, quotes).isSectorWide;

    let score: number;
    let dropType: DipDropType;
    let action: DipAction;
    let confidence: DipConfidence;
    let rationale: string;
    let riskNote: string;

    if (absChange < 2) {
      score = 28 + absChange * 8;
      dropType = 'correction';
      action = 'skip';
      confidence = 'medium';
      rationale = `Shallow ${changePercent.toFixed(1)}% move — wait for a clearer dip.`;
      riskNote = 'Buying here has little dip margin.';
    } else if (absChange <= 8) {
      score = 68 + (absChange - 2) * 4;
      dropType = sectorWide ? 'sector-wide' : 'technical';
      action = 'buy';
      confidence = sectorWide ? 'high' : 'medium';
      rationale = sectorWide
        ? `${changePercent.toFixed(1)}% pullback with sector-wide softness — classic staged-buy zone.`
        : `${changePercent.toFixed(1)}% pullback is in the preferred 2–8% dip band.`;
      riskNote = sectorWide
        ? 'Sector may stay weak for a few sessions.'
        : 'Confirm support holds before adding size.';
    } else if (absChange <= 12) {
      score = 58 - (absChange - 8) * 4;
      dropType = sectorWide ? 'sector-wide' : 'technical';
      action = 'watch';
      confidence = 'medium';
      rationale = `${changePercent.toFixed(1)}% drop is steep. Watch for stabilization before averaging.`;
      riskNote = 'Could be news-driven; avoid catching a falling knife.';
    } else {
      score = Math.max(18, 42 - (absChange - 12));
      dropType = 'news-based';
      action = 'skip';
      confidence = 'low';
      rationale = `Sharp ${changePercent.toFixed(1)}% drop looks news-driven. Wait 2–3 days.`;
      riskNote = 'Single-name event risk is elevated.';
    }

    if (sectorWide && action !== 'skip') {
      score = Math.min(95, score + 6);
    }

    return {
      symbol: stock.symbol,
      displayName: stock.displayName,
      score: this.clampScore(score),
      action,
      confidence,
      dropType,
      rationale,
      riskNote,
    };
  }

  private summarizeLocalPicks(picks: DipPick[]): string {
    const buys = picks.filter((p) => p.action === 'buy').length;
    const watches = picks.filter((p) => p.action === 'watch').length;
    if (buys === 0 && watches === 0) {
      return 'No attractive dips in the current red list. Stay patient.';
    }
    if (buys > 0) {
      return `${buys} buy-zone dip${buys === 1 ? '' : 's'} and ${watches} to watch. Ranked locally until Gemini responds.`;
    }
    return `${watches} name${watches === 1 ? '' : 's'} to watch. No high-conviction buy-zone dips yet.`;
  }

  private inferMarketTone(picks: DipPick[]): DipMarketTone {
    const buyShare = picks.filter((p) => p.action === 'buy').length / Math.max(picks.length, 1);
    const skipShare = picks.filter((p) => p.action === 'skip').length / Math.max(picks.length, 1);
    if (buyShare >= 0.5) return 'risk-on';
    if (skipShare >= 0.5) return 'defensive';
    return 'cautious';
  }

  private clampScore(value: number): number {
    if (!Number.isFinite(value)) return 50;
    return Math.max(0, Math.min(100, value));
  }

  private asAction(value: DipAction | string | undefined): DipAction {
    return value === 'buy' || value === 'watch' || value === 'skip' ? value : 'watch';
  }

  private asConfidence(value: DipConfidence | string | undefined): DipConfidence {
    return value === 'high' || value === 'medium' || value === 'low' ? value : 'medium';
  }

  private asDropType(value: DipDropType | string | undefined): DipDropType {
    return value === 'technical' ||
      value === 'sector-wide' ||
      value === 'news-based' ||
      value === 'correction' ||
      value === 'unknown'
      ? value
      : 'unknown';
  }

  private asMarketTone(value: DipMarketTone | string | undefined): DipMarketTone {
    return value === 'risk-on' || value === 'cautious' || value === 'defensive' ? value : 'cautious';
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
    const isSectorWide = downPercentage >= 50;

    return {
      isSectorWide,
      downCount: downStocks.length,
      message: `${downStocks.length}/${sectorStocks.length} stocks in ${sector} are down`
    };
  }
}
