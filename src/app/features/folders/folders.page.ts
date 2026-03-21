/**
 * Folders Page Component
 * Manage stocks in Growth Twenty and Dividend Ten folders
 */

import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortfolioService, LanguageService, ThemeService } from '../../core/services';
import { buildPageNumbers } from '../../shared/utils/pagination.utils';
import { FolderId } from '../../core/models/folder.model';
import { Stock } from '../../core/models/stock.model';

@Component({
  selector: 'app-folders-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './folders.page.html'
})
export class FoldersPageComponent {
  private portfolioService = inject(PortfolioService);
  readonly lang = inject(LanguageService);
  readonly themeService = inject(ThemeService);

  // UI State
  selectedFolderId = signal<FolderId>('GROWTH_20');
  showAddForm = signal(false);
  editingStock = signal<Stock | null>(null);
  
  // Pagination state
  currentPage = signal(1);
  pageSize = signal(10);
  pageSizeOptions = [10, 20, 50, 100];

  // New stock form
  newStock = signal({
    symbol: '',
    displayName: '',
    exchange: 'NSE' as 'NSE' | 'BSE',
    sector: ''
  });

  folders = this.portfolioService.folders;

  currentFolderStocks = computed(() => 
    this.portfolioService.getStocksByFolder(this.selectedFolderId())
  );

  // Paginated stocks
  paginatedStocks = computed(() => {
    const stocks = this.currentFolderStocks();
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return stocks.slice(start, end);
  });

  totalPages = computed(() => 
    Math.ceil(this.currentFolderStocks().length / this.pageSize()) || 1
  );
  
  // Page numbers for pagination display
  pageNumbers = computed(() => buildPageNumbers(this.currentPage(), this.totalPages()));

  currentFolder = computed(() => 
    this.portfolioService.getFolder(this.selectedFolderId())
  );

  // Method to get stock count for each folder (used in tabs)
  getFolderStockCount(folderId: FolderId): number {
    return this.portfolioService.getStocksByFolder(folderId).length;
  }

  onFolderChange(folderId: FolderId): void {
    this.selectedFolderId.set(folderId);
    this.showAddForm.set(false);
    this.editingStock.set(null);
    this.currentPage.set(1); // Reset to first page when changing folders
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1); // Reset to first page when changing page size
  }

  // Form field update methods for template
  updateSymbol(value: string): void {
    const current = this.newStock();
    this.newStock.set({ ...current, symbol: value });
  }

  updateDisplayName(value: string): void {
    const current = this.newStock();
    this.newStock.set({ ...current, displayName: value });
  }

  updateExchange(value: 'NSE' | 'BSE'): void {
    const current = this.newStock();
    this.newStock.set({ ...current, exchange: value });
  }

  updateSector(value: string): void {
    const current = this.newStock();
    this.newStock.set({ ...current, sector: value });
  }

  onAddStock(): void {
    const form = this.newStock();
    if (!form.symbol || !form.displayName) return;

    const stocks = this.currentFolderStocks();
    const nextRank = stocks.length + 1;

    this.portfolioService.addStock({
      symbol: form.symbol.toUpperCase(),
      displayName: form.displayName,
      exchange: form.exchange,
      folderId: this.selectedFolderId(),
      rank: nextRank,
      isActive: true,
      sector: form.sector || undefined
    });

    this.newStock.set({
      symbol: '',
      displayName: '',
      exchange: 'NSE',
      sector: ''
    });
    this.showAddForm.set(false);
  }

  onToggleActive(stock: Stock): void {
    this.portfolioService.toggleStockActive(stock.id);
  }

  onRemoveStock(stock: Stock): void {
    if (confirm(`Remove ${stock.symbol} from the folder?`)) {
      this.portfolioService.removeStock(stock.id);
    }
  }

  onMoveUp(stock: Stock): void {
    const stocks = this.currentFolderStocks();
    const index = stocks.findIndex(s => s.id === stock.id);
    if (index <= 0) return;

    const newOrder = stocks.map(s => s.id);
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    this.portfolioService.reorderStocks(this.selectedFolderId(), newOrder);
  }

  onMoveDown(stock: Stock): void {
    const stocks = this.currentFolderStocks();
    const index = stocks.findIndex(s => s.id === stock.id);
    if (index >= stocks.length - 1) return;

    const newOrder = stocks.map(s => s.id);
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    this.portfolioService.reorderStocks(this.selectedFolderId(), newOrder);
  }

  trackByStock(index: number, stock: Stock): string {
    return stock.id;
  }
}
