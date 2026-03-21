/**
 * Portfolio Insights Service
 * Analyzes holdings and generates AI-powered insights about portfolio health,
 * concentration, sector exposure, and diversification
 */

import { Injectable, computed, inject } from '@angular/core';
import { HoldingsService } from './holdings.service';
import { PortfolioService } from './portfolio.service';
import { Holding } from '../models';
import { FolderId } from '../models/folder.model';

export interface PortfolioInsight {
  category: 'concentration' | 'sector' | 'diversification' | 'performance' | 'opportunity';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  recommendation: string;
  metric?: number;
  metricLabel?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PortfolioInsightsService {
  private holdingsService = inject(HoldingsService);
  private portfolioService = inject(PortfolioService);

  /**
   * Generate insights for a specific folder
   */
  getInsights(folderId?: FolderId): PortfolioInsight[] {
    const holdings = this.holdingsService.holdings();
    const summary = this.holdingsService.summary();
    const stocks = folderId 
      ? this.portfolioService.getStocksByFolder(folderId)
      : this.portfolioService.stocks();

    const folderHoldings = folderId
      ? holdings.filter(h => h.folderId === folderId && h.totalQty > 0)
      : holdings.filter(h => h.totalQty > 0);

    if (folderHoldings.length === 0) {
      return [];
    }

    const insights: PortfolioInsight[] = [];

    // 1. Concentration Analysis
    const concentrationInsights = this.analyzeConcentration(folderHoldings);
    insights.push(...concentrationInsights);

    // 2. Sector Analysis
    const sectorInsights = this.analyzeSectorExposure(folderHoldings, stocks);
    insights.push(...sectorInsights);

    // 3. Diversification Analysis
    const diversificationInsights = this.analyzeDiversification(folderHoldings, stocks);
    insights.push(...diversificationInsights);

    // 4. Performance Analysis
    const performanceInsights = this.analyzePerformance(folderHoldings, summary);
    insights.push(...performanceInsights);

    return insights.sort((a, b) => {
      // Sort by severity: critical > warning > info
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Analyze portfolio concentration (single stock dominance)
   */
  private analyzeConcentration(holdings: Holding[]): PortfolioInsight[] {
    const totalValue = holdings.reduce((sum, h) => sum + (h.currentValue || h.investedAmount), 0);
    if (totalValue === 0) return [];

    const insights: PortfolioInsight[] = [];
    const topHoldings = holdings
      .map(h => ({
        symbol: h.symbol,
        allocation: ((h.currentValue || h.investedAmount) / totalValue) * 100
      }))
      .sort((a, b) => b.allocation - a.allocation);

    const topAllocation = topHoldings[0]?.allocation ?? 0;

    if (topAllocation > 50) {
      insights.push({
        category: 'concentration',
        severity: 'critical',
        title: '⚠️ Critical Concentration Risk',
        message: `${topHoldings[0].symbol} dominates your portfolio at ${topAllocation.toFixed(1)}%.`,
        recommendation: 'This puts your entire portfolio at risk. Consider selling 30-40% of this position and diversifying into other holdings.',
        metric: topAllocation,
        metricLabel: '% Portfolio'
      });
    } else if (topAllocation > 30) {
      insights.push({
        category: 'concentration',
        severity: 'warning',
        title: '⚠️ High Concentration',
        message: `${topHoldings[0].symbol} represents ${topAllocation.toFixed(1)}% of your portfolio.`,
        recommendation: 'Consider taking some profits and rebalancing to reduce single-stock risk.',
        metric: topAllocation,
        metricLabel: '% Portfolio'
      });
    } else if (topAllocation < 5 && holdings.length > 15) {
      insights.push({
        category: 'concentration',
        severity: 'info',
        title: '✅ Well Distributed Portfolio',
        message: `No single stock exceeds ${topAllocation.toFixed(1)}%. Your positions are well diversified.`,
        recommendation: 'Your portfolio concentration is healthy.',
        metric: topAllocation,
        metricLabel: '% Max Position'
      });
    }

    return insights;
  }

  /**
   * Analyze sector exposure and concentration
   */
  private analyzeSectorExposure(holdings: Holding[], stocks: any[]): PortfolioInsight[] {
    const totalValue = holdings.reduce((sum, h) => sum + (h.currentValue || h.investedAmount), 0);
    if (totalValue === 0) return [];

    const sectorMap = new Map<string, number>();
    const stockMap = new Map<string, { sector?: string }>();

    // Build stock sector map
    stocks.forEach(s => {
      stockMap.set(s.symbol, s);
    });

    // Group by sector
    holdings.forEach(h => {
      const stock = stockMap.get(h.symbol);
      const sector = stock?.sector || 'Unknown';
      const current = sectorMap.get(sector) || 0;
      sectorMap.set(sector, current + (h.currentValue || h.investedAmount));
    });

    const insights: PortfolioInsight[] = [];
    const topSectors = Array.from(sectorMap.entries())
      .map(([sector, value]) => ({
        sector,
        allocation: (value / totalValue) * 100
      }))
      .sort((a, b) => b.allocation - a.allocation);

    const topSectorAllocation = topSectors[0]?.allocation ?? 0;

    if (topSectorAllocation > 40) {
      insights.push({
        category: 'sector',
        severity: 'warning',
        title: `⚠️ Sector Concentration: ${topSectors[0].sector}`,
        message: `${topSectors[0].sector} sector accounts for ${topSectorAllocation.toFixed(1)}% of your portfolio.`,
        recommendation: 'Consider adding stocks from underrepresented sectors (Finance, IT, Consumer) to balance sector exposure.',
        metric: topSectorAllocation,
        metricLabel: '% Sector'
      });
    } else if (topSectors.length >= 5) {
      insights.push({
        category: 'sector',
        severity: 'info',
        title: '✅ Balanced Sector Exposure',
        message: `Your portfolio spans ${topSectors.length} sectors with good balance.`,
        recommendation: 'Your sector diversification is optimal.',
        metric: topSectors.length,
        metricLabel: 'Sectors'
      });
    }

    return insights;
  }

  /**
   * Analyze diversification (number of holdings, gaps)
   */
  private analyzeDiversification(holdings: Holding[], stocks: any[]): PortfolioInsight[] {
    const insights: PortfolioInsight[] = [];
    const populatedCount = holdings.filter(h => h.totalQty > 0).length;
    const totalAvailable = stocks.length;
    const holdingPercent = (populatedCount / totalAvailable) * 100;

    if (populatedCount < 5) {
      insights.push({
        category: 'diversification',
        severity: 'warning',
        title: '⚠️ Low Diversification',
        message: `You own only ${populatedCount} of ${totalAvailable} available stocks (${holdingPercent.toFixed(0)}%).`,
        recommendation: 'Start with 8-10 stocks minimum. This reduces unsystematic risk significantly.',
        metric: populatedCount,
        metricLabel: 'Holdings'
      });
    } else if (populatedCount >= 15) {
      insights.push({
        category: 'diversification',
        severity: 'info',
        title: '✅ Strong Diversification',
        message: `You own ${populatedCount} stocks (${holdingPercent.toFixed(0)}% of curated list).`,
        recommendation: 'Your diversification is excellent. You\'re capturing most of the portfolio benefit.',
        metric: populatedCount,
        metricLabel: 'Holdings'
      });
    }

    return insights;
  }

  /**
   * Analyze portfolio performance trends
   */
  private analyzePerformance(holdings: Holding[], summary: any): PortfolioInsight[] {
    const insights: PortfolioInsight[] = [];
    const totalPLPercent = summary.totalUnrealizedPLPercent ?? 0;
    const totalPL = summary.totalUnrealizedPL ?? 0;

    if (totalPL < -10) {
      insights.push({
        category: 'performance',
        severity: 'warning',
        title: '⚠️ Negative Returns',
        message: `Portfolio is down ${Math.abs(totalPLPercent).toFixed(1)}%. Total loss: ₹${Math.abs(totalPL).toFixed(0)}`,
        recommendation: 'Review underperforming stocks. Stop-loss or rebalance towards better performers.',
        metric: totalPLPercent,
        metricLabel: '% Return'
      });
    } else if (totalPL > 50) {
      insights.push({
        category: 'performance',
        severity: 'info',
        title: '🚀 Strong Gains',
        message: `Portfolio up ${totalPLPercent.toFixed(1)}% with ₹${totalPL.toFixed(0)} unrealized gains.`,
        recommendation: 'Great momentum! Consider taking partial profits on winners (20-30%) to lock in gains.',
        metric: totalPLPercent,
        metricLabel: '% Return'
      });
    } else if (totalPL > 0) {
      insights.push({
        category: 'performance',
        severity: 'info',
        title: '📈 Positive Returns',
        message: `Portfolio up ${totalPLPercent.toFixed(1)}%. ₹${totalPL.toFixed(0)} unrealized gains.`,
        recommendation: 'Good progress! Continue your investment strategy.',
        metric: totalPLPercent,
        metricLabel: '% Return'
      });
    }

    return insights;
  }
}
