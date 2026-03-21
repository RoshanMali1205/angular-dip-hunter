/**
 * Holdings Service - Compute holdings from transactions
 *
 * `holdings` is a computed signal: it automatically recomputes whenever
 * transactions, stocks, or quotes change — no manual recomputeHoldings()
 * or enrichWithQuotes() calls needed.
 */

import { Injectable, computed } from '@angular/core';
import { Holding, HoldingsSummary } from '../models/holding.model';
import { TransactionService } from './transaction.service';
import { PortfolioService } from './portfolio.service';
import { QuoteService } from './quote.service';
import { BuyTransaction } from '../models/transaction.model';

@Injectable({
  providedIn: 'root'
})
export class HoldingsService {
  constructor(
    private transactionService: TransactionService,
    private portfolioService: PortfolioService,
    private quoteService: QuoteService
  ) {}

  /**
   * Fully reactive holdings — recomputes automatically when any of:
   * portfolioService.stocks, transactionService.buyTransactions,
   * transactionService.dividendTransactions, or quoteService.quotes changes.
   *
   * Pre-groups transactions by stockId (O(1) per stock) instead of calling
   * getBuysByStock() (O(n)) for every stock in a loop.
   */
  readonly holdings = computed<Holding[]>(() => {
    const stocks = this.portfolioService.stocks();
    const buys = this.transactionService.buyTransactions();
    const divs = this.transactionService.dividendTransactions();
    const quotes = this.quoteService.quotes();
    const now = new Date().toISOString();

    // Pre-group buys by stockId: O(transactions) once, then O(1) per stock
    const buysByStock = new Map<string, BuyTransaction[]>();
    for (const t of buys) {
      const list = buysByStock.get(t.stockId);
      if (list) {
        list.push(t);
      } else {
        buysByStock.set(t.stockId, [t]);
      }
    }

    // Pre-sum dividends by stockId
    const dividendsByStock = new Map<string, number>();
    for (const t of divs) {
      dividendsByStock.set(t.stockId, (dividendsByStock.get(t.stockId) ?? 0) + t.amount);
    }

    const holdings: Holding[] = [];

    for (const stock of stocks) {
      const stockBuys = buysByStock.get(stock.id);
      if (!stockBuys?.length) continue;

      const totalQty = stockBuys.reduce((sum, t) => sum + t.qty, 0);
      const investedAmount = stockBuys.reduce((sum, t) => sum + t.totalAmount, 0);
      const avgPrice = totalQty > 0 ? investedAmount / totalQty : 0;
      const totalDividends = dividendsByStock.get(stock.id) ?? 0;

      const dates = stockBuys.map(t => t.date).sort();

      const quote = quotes[stock.symbol];
      const currentPrice = quote?.price;
      const currentValue = currentPrice !== undefined ? totalQty * currentPrice : undefined;
      const unrealizedPL = currentValue !== undefined ? currentValue - investedAmount : undefined;
      const unrealizedPLPercent =
        unrealizedPL !== undefined && investedAmount > 0
          ? (unrealizedPL / investedAmount) * 100
          : undefined;

      holdings.push({
        stockId: stock.id,
        symbol: stock.symbol,
        displayName: stock.displayName,
        folderId: stock.folderId,
        totalQty,
        investedAmount,
        avgPrice,
        currentPrice,
        currentValue,
        unrealizedPL,
        unrealizedPLPercent,
        totalDividends,
        firstBuyDate: dates[0],
        lastBuyDate: dates[dates.length - 1],
        lastUpdated: now
      });
    }

    return holdings;
  });

  /** O(1) lookup map: stockId → Holding */
  readonly holdingsMap = computed(() => {
    const map: Record<string, Holding> = {};
    for (const h of this.holdings()) {
      map[h.stockId] = h;
    }
    return map;
  });

  readonly summary = computed<HoldingsSummary>(() => {
    const holdings = this.holdings();

    const totalInvested = holdings.reduce((sum, h) => sum + h.investedAmount, 0);
    const totalCurrentValue = holdings.reduce(
      (sum, h) => sum + (h.currentValue ?? h.investedAmount), 0
    );
    const totalDividends = holdings.reduce((sum, h) => sum + h.totalDividends, 0);
    const totalUnrealizedPL = totalCurrentValue - totalInvested;
    const totalUnrealizedPLPercent =
      totalInvested > 0 ? (totalUnrealizedPL / totalInvested) * 100 : 0;

    return {
      totalInvested,
      totalCurrentValue,
      totalUnrealizedPL,
      totalUnrealizedPLPercent,
      totalDividends,
      holdingsCount: holdings.filter(h => h.totalQty > 0).length
    };
  });

  /** O(1) via holdingsMap */
  getHolding(stockId: string): Holding | undefined {
    return this.holdingsMap()[stockId];
  }

  getHoldingsByFolder(folderId: string): Holding[] {
    return this.holdings().filter(h => h.folderId === folderId);
  }
}
