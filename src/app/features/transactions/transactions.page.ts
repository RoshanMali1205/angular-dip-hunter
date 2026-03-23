import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionService } from '../../core/services/transaction.service';
import { PortfolioService } from '../../core/services/portfolio.service';
import { HoldingsService } from '../../core/services/holdings.service';
import { QuoteService } from '../../core/services/quote.service';
import { LanguageService } from '../../core/services/language.service';
import { ThemeService } from '../../core/services/theme.service';
import { PlannerService } from '../../core/services/planner.service';
import { DialogService } from '../../shared/components/dialog/dialog.service';
import { BuyTransaction, DividendTransaction, TransactionFilters } from '../../core/models/transaction.model';
import { Holding } from '../../core/models/holding.model';
import { Stock } from '../../core/models/stock.model';
import { FolderId } from '../../core/models/folder.model';

interface BuyFormData {
  folderId: FolderId;
  symbol: string;
  stockId: string;
  qty: number;
  price: number;
  charges: number;
  date: string;
}

interface DividendFormData {
  folderId: FolderId;
  symbol: string;
  stockId: string;
  amount: number;
  date: string;
}

@Component({
  selector: 'app-transactions-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transactions.page.html'
})
export class TransactionsPageComponent implements OnInit {
  readonly lang = inject(LanguageService);
  readonly themeService = inject(ThemeService);
  private readonly dialog = inject(DialogService);
  
  // State
  activeTab = signal<'buy' | 'dividend' | 'holdings'>('buy');
  isLoading = signal(false);
  selectedFolderId = signal<FolderId>('GROWTH_20');
  
  // Pagination for Buy Transactions
  buyCurrentPage = signal(1);
  buyPageSize = signal(10);
  
  // Pagination for Dividend Transactions
  dividendCurrentPage = signal(1);
  dividendPageSize = signal(10);
  
  // Pagination for Holdings
  holdingsCurrentPage = signal(1);
  holdingsPageSize = signal(10);
  
  pageSizeOptions = [10, 20, 50, 100];
  
  // Form state for Buy transaction
  buyForm = signal<BuyFormData>({
    folderId: 'GROWTH_20',
    symbol: '',
    stockId: '',
    qty: 0,
    price: 0,
    charges: 0,
    date: new Date().toISOString().split('T')[0]
  });
  
  // Form state for Dividend transaction
  dividendForm = signal<DividendFormData>({
    folderId: 'GROWTH_20',
    symbol: '',
    stockId: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0]
  });
  
  // Filters
  filters = signal<TransactionFilters>({});
  
  // Holdings (use getter to avoid initialization issues)
  get holdings() { return this.holdingsService.holdings; }
  get holdingsSummary() { return this.holdingsService.summary; }
  
  // Available stocks from folders
  availableStocks = computed(() => {
    const folderId = this.selectedFolderId();
    return this.portfolioService.getStocksByFolder(folderId);
  });
  
  // Filtered transactions
  filteredBuyTransactions = computed(() => {
    const all = this.transactionService.buyTransactions();
    const f = this.filters();
    return all.filter(t => {
      if (f.symbol && t.symbol !== f.symbol) return false;
      if (f.startDate && t.date < f.startDate) return false;
      if (f.endDate && t.date > f.endDate) return false;
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });
  
  // Paginated buy transactions
  paginatedBuyTransactions = computed(() => {
    const txns = this.filteredBuyTransactions();
    const start = (this.buyCurrentPage() - 1) * this.buyPageSize();
    return txns.slice(start, start + this.buyPageSize());
  });
  
  buyTotalPages = computed(() => 
    Math.ceil(this.filteredBuyTransactions().length / this.buyPageSize())
  );
  
  filteredDividendTransactions = computed(() => {
    const all = this.transactionService.dividendTransactions();
    const f = this.filters();
    return all.filter(t => {
      if (f.symbol && t.symbol !== f.symbol) return false;
      if (f.startDate && t.date < f.startDate) return false;
      if (f.endDate && t.date > f.endDate) return false;
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });
  
  // Paginated dividend transactions
  paginatedDividendTransactions = computed(() => {
    const txns = this.filteredDividendTransactions();
    const start = (this.dividendCurrentPage() - 1) * this.dividendPageSize();
    return txns.slice(start, start + this.dividendPageSize());
  });
  
  dividendTotalPages = computed(() => 
    Math.ceil(this.filteredDividendTransactions().length / this.dividendPageSize())
  );
  
  // Paginated holdings
  paginatedHoldings = computed(() => {
    const allHoldings = this.holdings();
    const start = (this.holdingsCurrentPage() - 1) * this.holdingsPageSize();
    return allHoldings.slice(start, start + this.holdingsPageSize());
  });
  
  holdingsTotalPages = computed(() => 
    Math.ceil(this.holdings().length / this.holdingsPageSize())
  );
  
  constructor(
    private transactionService: TransactionService,
    private portfolioService: PortfolioService,
    private holdingsService: HoldingsService,
    private quoteService: QuoteService,
    private plannerService: PlannerService
  ) {}

  /** Get the month label for a planId badge (e.g. "Mar 2026") */
  getPlanLabel(planId: string | undefined): string | null {
    if (!planId) return null;
    const plan = this.plannerService.plans().find(p => p.id === planId);
    if (!plan) return null;
    const [year, month] = plan.month.split('-');
    return new Date(+year, +month - 1).toLocaleString('en-IN', { month: 'short', year: 'numeric' });
  }
  
  ngOnInit(): void {
    this.loadHoldings();
  }
  
  // Tab navigation
  setTab(tab: 'buy' | 'dividend' | 'holdings'): void {
    this.activeTab.set(tab);
    if (tab === 'holdings') {
      this.loadHoldings();
    }
  }
  
  // Load holdings with quotes — holdings recompute automatically via computed()
  async loadHoldings(): Promise<void> {
    this.isLoading.set(true);
    try {
      const symbols = this.portfolioService.getActiveSymbols();
      await this.quoteService.fetchQuotes(symbols);
    } finally {
      this.isLoading.set(false);
    }
  }
  
  // Buy form handlers
  updateBuyField(field: keyof BuyFormData, value: any): void {
    const current = this.buyForm();
    this.buyForm.set({ ...current, [field]: value });
    
    // If symbol changed, update stockId and auto-fetch price
    if (field === 'symbol') {
      const stock = this.portfolioService.getStockBySymbol(value);
      if (stock) {
        const quote = this.quoteService.getQuote(stock.symbol);
        this.buyForm.set({ ...this.buyForm(), stockId: stock.id, price: quote?.price ?? 0 });
      }
    }
    
    // If folder changed, update selectedFolderId and reset symbol
    if (field === 'folderId') {
      this.selectedFolderId.set(value as FolderId);
      this.buyForm.set({ ...this.buyForm(), symbol: '', stockId: '' });
    }
  }
  
  onSubmitBuy(): void {
    const form = this.buyForm();
    if (!form.symbol || !form.stockId || !form.qty || !form.price || !form.date) {
      return;
    }
    
    this.transactionService.addBuy({
      symbol: form.symbol,
      stockId: form.stockId,
      qty: form.qty,
      price: form.price,
      charges: form.charges || 0,
      date: form.date
    });

    // Reset form
    this.buyForm.set({
      folderId: form.folderId,
      symbol: '',
      stockId: '',
      qty: 0,
      price: 0,
      charges: 0,
      date: new Date().toISOString().split('T')[0]
    });
  }
  
  async onDeleteBuy(tx: BuyTransaction): Promise<void> {
    const ok = await this.dialog.danger(`Delete buy transaction for ${tx.symbol}?`, 'Delete Transaction');
    if (ok) {
      this.transactionService.deleteTransaction(tx.id);
    }
  }
  
  // Dividend form handlers
  updateDividendField(field: keyof DividendFormData, value: any): void {
    const current = this.dividendForm();
    this.dividendForm.set({ ...current, [field]: value });
    
    // If symbol changed, update stockId
    if (field === 'symbol') {
      const stock = this.portfolioService.getStockBySymbol(value);
      if (stock) {
        this.dividendForm.set({ ...this.dividendForm(), stockId: stock.id });
      }
    }
    
    // If folder changed, update selectedFolderId and reset symbol
    if (field === 'folderId') {
      this.selectedFolderId.set(value as FolderId);
      this.dividendForm.set({ ...this.dividendForm(), symbol: '', stockId: '' });
    }
  }
  
  onSubmitDividend(): void {
    const form = this.dividendForm();
    if (!form.symbol || !form.stockId || !form.amount || !form.date) {
      return;
    }
    
    this.transactionService.addDividend({
      symbol: form.symbol,
      stockId: form.stockId,
      amount: form.amount,
      date: form.date
    });

    // Reset form
    this.dividendForm.set({
      folderId: form.folderId,
      symbol: '',
      stockId: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0]
    });
  }
  
  async onDeleteDividend(tx: DividendTransaction): Promise<void> {
    const ok = await this.dialog.danger(`Delete dividend transaction for ${tx.symbol}?`, 'Delete Transaction');
    if (ok) {
      this.transactionService.deleteTransaction(tx.id);
    }
  }
  
  // Filter handlers
  updateFilter(field: keyof TransactionFilters, value: any): void {
    const current = this.filters();
    if (value === '' || value === null || value === undefined) {
      const updated = { ...current };
      delete updated[field];
      this.filters.set(updated);
    } else {
      this.filters.set({ ...current, [field]: value });
    }
  }
  
  clearFilters(): void {
    this.filters.set({});
  }
  
  // Formatting
  formatCurrency(value: number | undefined): string {
    if (value === undefined) return '—';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(value);
  }
  
  formatPercent(value: number | undefined): string {
    if (value === undefined) return '—';
    return (value >= 0 ? '+' : '') + value.toFixed(2) + '%';
  }
  
  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
  
  // Track by functions
  trackByTx(index: number, tx: BuyTransaction | DividendTransaction): string {
    return tx.id;
  }
  
  trackByHolding(index: number, h: Holding): string {
    return h.stockId;
  }
  
  trackByStock(index: number, s: Stock): string {
    return s.id;
  }
  
  // Pagination handlers
  onBuyPageChange(page: number): void {
    if (page >= 1 && page <= this.buyTotalPages()) {
      this.buyCurrentPage.set(page);
    }
  }
  
  onBuyPageSizeChange(size: number): void {
    this.buyPageSize.set(size);
    this.buyCurrentPage.set(1);
  }
  
  onDividendPageChange(page: number): void {
    if (page >= 1 && page <= this.dividendTotalPages()) {
      this.dividendCurrentPage.set(page);
    }
  }
  
  onDividendPageSizeChange(size: number): void {
    this.dividendPageSize.set(size);
    this.dividendCurrentPage.set(1);
  }
  
  onHoldingsPageChange(page: number): void {
    if (page >= 1 && page <= this.holdingsTotalPages()) {
      this.holdingsCurrentPage.set(page);
    }
  }
  
  onHoldingsPageSizeChange(size: number): void {
    this.holdingsPageSize.set(size);
    this.holdingsCurrentPage.set(1);
  }
}
