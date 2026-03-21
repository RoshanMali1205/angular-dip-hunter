/**
 * Core Models - Barrel Export
 */

export * from './folder.model';
export * from './stock.model';
export * from './quote.model';
export * from './plan.model';
export * from './transaction.model';
export * from './holding.model';
export * from './settings.model';
export * from './user.model';
export * from './performance.model';

/**
 * StockViewModel - Used by dashboard/tables (combines Stock + Quote + Holding data)
 */
import { FolderId } from './folder.model';

export interface StockViewModel {
  // Stock info
  stockId: string;
  symbol: string;
  displayName: string;
  folderId: FolderId;
  rank: number;
  isActive: boolean;
  sector?: string;
  
  // Quote info (from QuoteService)
  price?: number;
  change?: number;
  changePercent?: number;
  quoteUpdatedAt?: string;
  
  // Red flag (derived)
  isRed: boolean;
  
  // Plan info (from PlannerService)
  isInCurrentPlan: boolean;
  
  // Holdings info (optional, from HoldingsService)
  holdingQty?: number;
  avgPrice?: number;
  investedAmount?: number;
  currentValue?: number;
  unrealizedPL?: number;
  unrealizedPLPercent?: number;
}

/**
 * Dashboard KPIs
 */
export interface DashboardKPIs {
  totalStocks: number;
  activeStocks: number;
  redStocks: number;
  greenStocks: number;
  totalInvested: number;
  currentValue: number;
  totalPL: number;
  totalPLPercent: number;
}
