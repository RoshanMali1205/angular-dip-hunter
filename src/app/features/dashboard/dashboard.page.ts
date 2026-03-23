/**
 * Dashboard Page Component
 * Main dashboard with folder view, KPIs, stock list, and red candidates
 */

import { Component, OnInit, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PortfolioService,
  QuoteService,
  SettingsService,
  PlannerService,
  HoldingsService,
  ThemeService,
  LanguageService
} from '../../core/services';
import { TourService } from '../../core/services/tour.service';
import { FolderId } from '../../core/models/folder.model';
import { StockViewModel, DashboardKPIs, Holding } from '../../core/models';
import {
  SkeletonCardComponent,
  SkeletonStockRowComponent,
  RadialProgressComponent
} from '../../shared/components';
import { buildPageNumbers } from '../../shared/utils/pagination.utils';
import { HoldingsPieChartComponent, PieGroupBy, PortfolioInsightsCardComponent } from './components';

export interface ProgressMetric {
  id: string;
  label: string;
  value: number;
  max: number;
  color: 'emerald' | 'blue' | 'red' | 'purple' | 'cyan' | 'amber';
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    SkeletonCardComponent, 
    SkeletonStockRowComponent,
    RadialProgressComponent,
    HoldingsPieChartComponent
  ],
  templateUrl: './dashboard.page.html'
})
export class DashboardPageComponent implements OnInit {
  private portfolioService = inject(PortfolioService);
  private quoteService = inject(QuoteService);
  private settingsService = inject(SettingsService);
  private plannerService = inject(PlannerService);
  private tourService = inject(TourService);
  public holdingsService = inject(HoldingsService);

  public themeService = inject(ThemeService);
  public lang = inject(LanguageService);

  constructor() {
    // Show data source popup after the tour finishes for first-time users
    effect(() => {
      if (this.tourService.justFinished()) {
        this.showDataSourceModal.set(true);
        this.tourService.consumeJustFinished();
      }
    });
  }

  // UI State
  selectedFolderId = signal<FolderId>('GROWTH_20');
  searchText = signal('');
  showRedOnly = signal(false);
  isLoading = signal(false);
  pieGroupBy = signal<PieGroupBy>('stock');
  showDataSourceModal = signal(false);
  
  // Pagination
  currentPage = signal(1);
  pageSize = signal(10);
  pageSizeOptions = [10, 20, 50, 100];

  // Folder tabs
  folders = this.portfolioService.folders;

  // Computed stock view models
  stockViewModels = computed<StockViewModel[]>(() => {
    const stocks = this.portfolioService.getStocksByFolder(this.selectedFolderId());
    const quotes = this.quoteService.quotes();
    const holdings = this.holdingsService.holdingsMap();
    const search = this.searchText().toLowerCase();
    const redOnly = this.showRedOnly();

    let vms = stocks.map(stock => {
      const quote = quotes[stock.symbol];
      const holding = holdings[stock.id];
      const isRed = this.settingsService.isRed(quote);
      const isInCurrentPlan = this.plannerService.isInCurrentPlan(stock.id);

      const vm: StockViewModel = {
        stockId: stock.id,
        symbol: stock.symbol,
        displayName: stock.displayName,
        folderId: stock.folderId,
        rank: stock.rank,
        isActive: stock.isActive,
        sector: stock.sector,
        price: quote?.price,
        change: quote?.change,
        changePercent: quote?.changePercent,
        quoteUpdatedAt: quote?.timestamp,
        isRed,
        isInCurrentPlan,
        holdingQty: holding?.totalQty,
        avgPrice: holding?.avgPrice,
        investedAmount: holding?.investedAmount,
        currentValue: holding?.currentValue,
        unrealizedPL: holding?.unrealizedPL,
        unrealizedPLPercent: holding?.unrealizedPLPercent
      };
      return vm;
    });

    // Filter by search
    if (search) {
      vms = vms.filter(v => 
        v.symbol.toLowerCase().includes(search) ||
        v.displayName.toLowerCase().includes(search)
      );
    }

    // Filter by red only
    if (redOnly) {
      vms = vms.filter(v => v.isRed);
    }

    return vms;
  });

  // Paginated stock view models
  paginatedStockViewModels = computed(() => {
    const vms = this.stockViewModels();
    const start = (this.currentPage() - 1) * this.pageSize();
    return vms.slice(start, start + this.pageSize());
  });
  
  // Total pages
  totalPages = computed(() => 
    Math.ceil(this.stockViewModels().length / this.pageSize()) || 1
  );
  
  // Page numbers for pagination display
  pageNumbers = computed(() => buildPageNumbers(this.currentPage(), this.totalPages()));

  // Red candidates
  redCandidates = computed(() => 
    this.stockViewModels().filter(v => v.isRed && !v.isInCurrentPlan)
  );

  // Holdings filtered by selected folder for pie chart
  filteredHoldings = computed<Holding[]>(() => {
    const holdings = this.holdingsService.holdings();
    const folderId = this.selectedFolderId();
    return holdings.filter(h => h.folderId === folderId && h.totalQty > 0);
  });

  // Progress metrics for radial indicators
  progressMetrics = computed<ProgressMetric[]>(() => {
    const summary = this.holdingsService.summary();
    const kpis = this.kpis();
    const targetReturn = 15; // Target 15% P/L
    const portfolioGoal = 1000000; // Target ₹10L investment

    return [
      {
        id: 'pl',
        label: 'P/L Goal',
        value: Math.max(0, summary.totalUnrealizedPLPercent),
        max: targetReturn,
        color: summary.totalUnrealizedPL >= 0 ? 'emerald' : 'red'
      },
      {
        id: 'invested',
        label: 'Invest Goal',
        value: summary.totalInvested,
        max: portfolioGoal,
        color: 'blue'
      },
      {
        id: 'diversify',
        label: 'Diversified',
        value: kpis.totalStocks,
        max: 30, // Target 30 stocks
        color: 'purple'
      },
      {
        id: 'recovery',
        label: 'Green Rate',
        value: kpis.greenStocks,
        max: kpis.totalStocks || 1,
        color: 'cyan'
      }
    ];
  });

  // KPIs
  kpis = computed<DashboardKPIs>(() => {
    const vms = this.stockViewModels();
    const summary = this.holdingsService.summary();

    return {
      totalStocks: vms.length,
      activeStocks: vms.filter(v => v.isActive).length,
      redStocks: vms.filter(v => v.isRed).length,
      greenStocks: vms.filter(v => !v.isRed && v.price !== undefined).length,
      totalInvested: summary.totalInvested,
      currentValue: summary.totalCurrentValue,
      totalPL: summary.totalUnrealizedPL,
      totalPLPercent: summary.totalUnrealizedPLPercent
    };
  });

  lastUpdated = this.quoteService.lastUpdated;
  quoteError = this.quoteService.error;

  ngOnInit(): void {
    this.loadQuotes();

    // If the tour is already completed (returning user who cleared dh_welcome_shown),
    // show the popup immediately since the tour won't run to trigger it.
    // For first-time users (tour not completed), the effect() will show it after tour finishes.
    if (!localStorage.getItem('dh_welcome_shown') && this.tourService.isCompleted()) {
      this.showDataSourceModal.set(true);
    }
  }

  onChooseDataSource(source: 'yahoo' | 'mock'): void {
    this.settingsService.updateSettings({ quoteDataSource: source });
    localStorage.setItem('dh_welcome_shown', '1');
    this.showDataSourceModal.set(false);
    // Clear any cached quotes from the initial load (which used the default source)
    // so the next fetch uses the correct source
    this.quoteService.clearCache();
    this.loadQuotes();
  }

  /**
   * Load quotes for all folders at once so switching tabs is instant
   */
  loadQuotes(): void {
    this.isLoading.set(true);
    const symbols = this.portfolioService.getActiveSymbols(); // all folders
    this.quoteService.fetchQuotes(symbols).subscribe({
      next: () => this.isLoading.set(false),
      error: () => this.isLoading.set(false)
    });
  }

  /**
   * Refresh quotes (bypass cache) — fetch all 30 stocks at once
   */
  onRefresh(): void {
    this.isLoading.set(true);
    const symbols = this.portfolioService.getActiveSymbols(); // all folders
    this.quoteService.refresh(symbols).subscribe({
      next: () => this.isLoading.set(false),
      error: () => this.isLoading.set(false)
    });
  }

  /**
   * Change folder tab
   */
  onFolderChange(folderId: FolderId): void {
    this.selectedFolderId.set(folderId);
    this.currentPage.set(1);
    this.loadQuotes();
  }
  
  /**
   * Change page
   */
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  /**
   * Change page size
   */
  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  /**
   * Toggle red only filter
   */
  onToggleRedOnly(): void {
    this.showRedOnly.update(v => !v);
  }

  /**
   * Add stock to current month's plan
   */
  onAddToPlan(vm: StockViewModel): void {
    const plan = this.plannerService.getOrCreatePlan(this.plannerService.currentMonth);
    const quote = this.quoteService.getQuote(vm.symbol);
    this.plannerService.addItem(plan.id, vm.stockId, vm.symbol, quote);
  }

  /**
   * Format currency
   */
  formatCurrency(value: number | undefined): string {
    if (value === undefined) return '—';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  /**
   * Format percent
   */
  formatPercent(value: number | undefined): string {
    if (value === undefined) return '—';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  /**
   * Track by function for stock list
   */
  trackByStock(index: number, vm: StockViewModel): string {
    return vm.stockId;
  }
}
