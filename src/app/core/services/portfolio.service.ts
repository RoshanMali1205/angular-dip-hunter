/**
 * Portfolio Service - Manage folders and stocks
 */

import { Injectable, computed, signal } from '@angular/core';
import { 
  Folder, 
  FolderId, 
  DEFAULT_FOLDERS 
} from '../models/folder.model';
import { 
  Stock, 
  GROWTH_20_STOCKS, 
  DIVIDEND_10_STOCKS 
} from '../models/stock.model';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class PortfolioService {
  // State signals
  private readonly _folders = signal<Folder[]>([]);
  private readonly _stocks = signal<Stock[]>([]);

  // Public readonly signals
  readonly folders = this._folders.asReadonly();
  readonly stocks = this._stocks.asReadonly();

  // Computed signals
  readonly activeStocks = computed(() =>
    this._stocks().filter(s => s.isActive)
  );

  readonly growth20Stocks = computed(() =>
    this._stocks()
      .filter(s => s.folderId === 'GROWTH_20' && s.isActive)
      .sort((a, b) => a.rank - b.rank)
  );

  readonly dividend10Stocks = computed(() =>
    this._stocks()
      .filter(s => s.folderId === 'DIVIDEND_10' && s.isActive)
      .sort((a, b) => a.rank - b.rank)
  );

  /** O(1) stock lookup by id */
  private readonly _stocksById = computed(() => {
    const map = new Map<string, Stock>();
    for (const s of this._stocks()) map.set(s.id, s);
    return map;
  });

  /** O(1) stock lookup by symbol */
  private readonly _stocksBySymbol = computed(() => {
    const map = new Map<string, Stock>();
    for (const s of this._stocks()) map.set(s.symbol, s);
    return map;
  });

  /** O(1) folder stock lookup — pre-filtered and sorted active stocks */
  private readonly _stocksByFolder = computed(() => {
    const map = new Map<FolderId, Stock[]>();
    const sorted = this._stocks()
      .filter(s => s.isActive)
      .sort((a, b) => a.rank - b.rank);
    for (const s of sorted) {
      const list = map.get(s.folderId) ?? [];
      list.push(s);
      map.set(s.folderId, list);
    }
    return map;
  });

  constructor(private storage: StorageService) {
    this.loadFromStorage();
  }

  /**
   * Load portfolio data from storage or seed with defaults
   */
  private loadFromStorage(): void {
    const folders = this.storage.get<Folder[]>('dh_folders');
    const stocks = this.storage.get<Stock[]>('dh_stocks');

    if (folders && folders.length > 0) {
      this._folders.set(folders);
    } else {
      this._folders.set(DEFAULT_FOLDERS);
      this.storage.set('dh_folders', DEFAULT_FOLDERS);
    }

    if (stocks && stocks.length > 0) {
      this._stocks.set(stocks);
    } else {
      this.seedDefaultStocks();
    }
  }

  /**
   * Seed default stocks for both folders
   */
  private seedDefaultStocks(): void {
    const now = new Date().toISOString();
    const allStocks: Stock[] = [
      ...GROWTH_20_STOCKS.map((s, i) => ({
        ...s,
        id: `growth_${i + 1}`,
        createdAt: now,
        updatedAt: now
      })),
      ...DIVIDEND_10_STOCKS.map((s, i) => ({
        ...s,
        id: `dividend_${i + 1}`,
        createdAt: now,
        updatedAt: now
      }))
    ];
    this._stocks.set(allStocks);
    this.storage.set('dh_stocks', allStocks);
  }

  /**
   * Get folder by ID
   */
  getFolder(folderId: FolderId): Folder | undefined {
    return this._folders().find(f => f.id === folderId);
  }

  /**
   * Get stocks by folder — O(1) via pre-computed map
   */
  getStocksByFolder(folderId: FolderId): Stock[] {
    return this._stocksByFolder().get(folderId) ?? [];
  }

  /**
   * Get all active stock symbols
   */
  getActiveSymbols(folderId?: FolderId): string[] {
    let stocks = this._stocks().filter(s => s.isActive);
    if (folderId) {
      stocks = stocks.filter(s => s.folderId === folderId);
    }
    return stocks.map(s => s.symbol);
  }

  /**
   * Get stock by ID — O(1) via pre-computed map
   */
  getStock(stockId: string): Stock | undefined {
    return this._stocksById().get(stockId);
  }

  /**
   * Get stock by symbol — O(1) via pre-computed map
   */
  getStockBySymbol(symbol: string): Stock | undefined {
    return this._stocksBySymbol().get(symbol);
  }

  /**
   * Add a new stock
   */
  addStock(stock: Omit<Stock, 'id' | 'createdAt' | 'updatedAt'>): Stock {
    const now = new Date().toISOString();
    const newStock: Stock = {
      ...stock,
      id: `stock_${Date.now()}`,
      createdAt: now,
      updatedAt: now
    };
    
    const updated = [...this._stocks(), newStock];
    this._stocks.set(updated);
    this.storage.set('dh_stocks', updated);
    
    return newStock;
  }

  /**
   * Update stock
   */
  updateStock(stockId: string, patch: Partial<Stock>): Stock | null {
    const stocks = this._stocks();
    const index = stocks.findIndex(s => s.id === stockId);
    
    if (index === -1) return null;
    
    const updated = [...stocks];
    updated[index] = {
      ...updated[index],
      ...patch,
      updatedAt: new Date().toISOString()
    };
    
    this._stocks.set(updated);
    this.storage.set('dh_stocks', updated);
    
    return updated[index];
  }

  /**
   * Remove stock
   */
  removeStock(stockId: string): boolean {
    const stocks = this._stocks();
    const filtered = stocks.filter(s => s.id !== stockId);
    
    if (filtered.length === stocks.length) return false;
    
    this._stocks.set(filtered);
    this.storage.set('dh_stocks', filtered);
    
    return true;
  }

  /**
   * Toggle stock active status
   */
  toggleStockActive(stockId: string): Stock | null {
    const stock = this.getStock(stockId);
    if (!stock) return null;
    
    return this.updateStock(stockId, { isActive: !stock.isActive });
  }

  /**
   * Reorder stocks in a folder
   */
  reorderStocks(folderId: FolderId, newOrder: string[]): void {
    const stocks = this._stocks();
    const updated = stocks.map(stock => {
      if (stock.folderId !== folderId) return stock;
      
      const newRank = newOrder.indexOf(stock.id);
      if (newRank === -1) return stock;
      
      return {
        ...stock,
        rank: newRank + 1,
        updatedAt: new Date().toISOString()
      };
    });
    
    this._stocks.set(updated);
    this.storage.set('dh_stocks', updated);
  }
}
