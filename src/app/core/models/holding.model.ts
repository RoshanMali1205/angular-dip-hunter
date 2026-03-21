/**
 * Holding Model - Computed portfolio holding summary
 */

import { FolderId } from './folder.model';

export interface Holding {
  stockId: string;
  symbol: string;
  displayName: string;
  folderId: FolderId;
  
  // Quantity & Cost
  totalQty: number;
  investedAmount: number;  // Total cost including charges
  avgPrice: number;  // investedAmount / totalQty
  
  // Current Value (enriched from quotes)
  currentPrice?: number;
  currentValue?: number;  // totalQty * currentPrice
  
  // P/L
  unrealizedPL?: number;  // currentValue - investedAmount
  unrealizedPLPercent?: number;
  
  // Dividend
  totalDividends: number;
  
  // Metadata
  firstBuyDate: string;
  lastBuyDate: string;
  lastUpdated: string;
}

export interface HoldingsSummary {
  totalInvested: number;
  totalCurrentValue: number;
  totalUnrealizedPL: number;
  totalUnrealizedPLPercent: number;
  totalDividends: number;
  holdingsCount: number;
}
