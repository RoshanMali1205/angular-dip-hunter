/**
 * Transaction Model - Buy and Dividend transactions
 */

export type TransactionType = 'BUY' | 'DIVIDEND';

export interface BuyTransaction {
  id: string;
  type: 'BUY';
  date: string;  // ISO date string
  symbol: string;
  stockId: string;
  qty: number;
  price: number;
  charges: number;  // Brokerage, taxes, etc.
  totalAmount: number;  // qty * price + charges
  planId?: string;  // Reference to monthly plan if executed from plan
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DividendTransaction {
  id: string;
  type: 'DIVIDEND';
  date: string;
  symbol: string;
  stockId: string;
  amount: number;
  dividendPerShare?: number;
  qty?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type Transaction = BuyTransaction | DividendTransaction;

export interface TransactionFilters {
  type?: TransactionType;
  symbol?: string;
  month?: string;  // YYYY-MM
  startDate?: string;
  endDate?: string;
}
