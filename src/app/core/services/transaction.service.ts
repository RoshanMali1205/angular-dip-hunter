/**
 * Transaction Service - Buy and Dividend transactions
 */

import { Injectable, signal, computed } from '@angular/core';
import { 
  Transaction, 
  BuyTransaction, 
  DividendTransaction, 
  TransactionFilters 
} from '../models/transaction.model';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private readonly _transactions = signal<Transaction[]>([]);

  readonly transactions = this._transactions.asReadonly();

  readonly buyTransactions = computed(() => 
    this._transactions().filter((t): t is BuyTransaction => t.type === 'BUY')
  );

  readonly dividendTransactions = computed(() => 
    this._transactions().filter((t): t is DividendTransaction => t.type === 'DIVIDEND')
  );

  constructor(private storage: StorageService) {
    this.loadFromStorage();
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  }

  /**
   * Load transactions from storage
   */
  private loadFromStorage(): void {
    const stored = this.storage.get<Transaction[]>('dh_transactions');
    if (stored) {
      this._transactions.set(stored);
    }
  }

  /**
   * Save transactions to storage
   */
  private saveToStorage(): void {
    this.storage.set('dh_transactions', this._transactions());
  }

  /**
   * Add buy transaction
   */
  addBuy(txn: Omit<BuyTransaction, 'id' | 'type' | 'createdAt' | 'updatedAt' | 'totalAmount'>): BuyTransaction {
    const now = new Date().toISOString();
    const totalAmount = (txn.qty * txn.price) + txn.charges;
    
    const newTxn: BuyTransaction = {
      ...txn,
      id: this.generateId('buy'),
      type: 'BUY',
      totalAmount,
      createdAt: now,
      updatedAt: now
    };

    const updated = [...this._transactions(), newTxn];
    this._transactions.set(updated);
    this.saveToStorage();

    return newTxn;
  }

  /**
   * Add dividend transaction
   */
  addDividend(txn: Omit<DividendTransaction, 'id' | 'type' | 'createdAt' | 'updatedAt'>): DividendTransaction {
    const now = new Date().toISOString();
    
    const newTxn: DividendTransaction = {
      ...txn,
      id: this.generateId('div'),
      type: 'DIVIDEND',
      createdAt: now,
      updatedAt: now
    };

    const updated = [...this._transactions(), newTxn];
    this._transactions.set(updated);
    this.saveToStorage();

    return newTxn;
  }

  /**
   * Bulk import transactions from CSV import rows
   */
  bulkImport(rows: { date: string; symbol: string; stockId: string; qty: number; price: number; charges: number; type: 'BUY' | 'DIVIDEND' }[]): number {
    const now = new Date().toISOString();
    const newTxns: (BuyTransaction | DividendTransaction)[] = [];

    for (const row of rows) {
      if (row.type === 'DIVIDEND') {
        const divTxn: DividendTransaction = {
          id: this.generateId('div'),
          type: 'DIVIDEND',
          date: row.date,
          symbol: row.symbol,
          stockId: row.stockId,
          amount: row.qty * row.price,
          createdAt: now,
          updatedAt: now
        };
        newTxns.push(divTxn);
      } else {
        const totalAmount = (row.qty * row.price) + row.charges;
        const buyTxn: BuyTransaction = {
          id: this.generateId('buy'),
          type: 'BUY',
          date: row.date,
          symbol: row.symbol,
          stockId: row.stockId,
          qty: row.qty,
          price: row.price,
          charges: row.charges,
          totalAmount,
          createdAt: now,
          updatedAt: now
        };
        newTxns.push(buyTxn);
      }
    }

    const updated = [...this._transactions(), ...newTxns];
    this._transactions.set(updated);
    this.saveToStorage();
    return newTxns.length;
  }

  /**
   * Get transactions with filters
   */
  getTransactions(filters?: TransactionFilters): Transaction[] {
    let txns = this._transactions();

    if (filters) {
      if (filters.type) {
        txns = txns.filter(t => t.type === filters.type);
      }
      if (filters.symbol) {
        txns = txns.filter(t => t.symbol === filters.symbol);
      }
      if (filters.month) {
        txns = txns.filter(t => t.date.startsWith(filters.month!));
      }
      if (filters.startDate) {
        txns = txns.filter(t => t.date >= filters.startDate!);
      }
      if (filters.endDate) {
        txns = txns.filter(t => t.date <= filters.endDate!);
      }
    }

    // Sort by date descending (spread to avoid mutating the signal array)
    return [...txns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * Get buy transactions for a stock
   */
  getBuysByStock(stockId: string): BuyTransaction[] {
    return this.buyTransactions().filter(t => t.stockId === stockId);
  }

  /**
   * Get dividends for a stock
   */
  getDividendsByStock(stockId: string): DividendTransaction[] {
    return this.dividendTransactions().filter(t => t.stockId === stockId);
  }

  /**
   * Delete transaction
   */
  deleteTransaction(id: string): boolean {
    const txns = this._transactions();
    const filtered = txns.filter(t => t.id !== id);
    
    if (filtered.length === txns.length) return false;
    
    this._transactions.set(filtered);
    this.saveToStorage();
    
    return true;
  }

  /**
   * Get total invested for a stock
   */
  getTotalInvested(stockId: string): number {
    return this.getBuysByStock(stockId)
      .reduce((sum, t) => sum + t.totalAmount, 0);
  }

  /**
   * Get total quantity for a stock
   */
  getTotalQty(stockId: string): number {
    return this.getBuysByStock(stockId)
      .reduce((sum, t) => sum + t.qty, 0);
  }

  /**
   * Get total dividends for a stock
   */
  getTotalDividends(stockId: string): number {
    return this.getDividendsByStock(stockId)
      .reduce((sum, t) => sum + t.amount, 0);
  }
}
