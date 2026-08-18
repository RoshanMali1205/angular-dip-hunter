/**
 * Dashboard Page Component
 * Main dashboard with folder view, KPIs, stock list, and red candidates
 */

import { Component, OnInit, OnDestroy, signal, computed, inject, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { QuoteDataSource } from '../../core/models/settings.model';
import {
  PortfolioService,
  QuoteService,
  SettingsService,
  PlannerService,
  HoldingsService,
  ThemeService,
  LanguageService,
  NetworkStatusService,
  StockAnalysisService,
  DipSignalService
} from '../../core/services';
import { TourService } from '../../core/services/tour.service';
import { PriceAlertService } from '../../core/services/price-alert.service';
import { FolderId } from '../../core/models/folder.model';
import { Stock } from '../../core/models/stock.model';
import { StockViewModel, DashboardKPIs, Holding } from '../../core/models';
import { DipPick, DipPrediction } from '../../core/models/plan.model';
import { DialogService } from '../../shared/components/dialog/dialog.service';
import {
  SkeletonCardComponent,
  SkeletonStockRowComponent,
  RadialProgressComponent,
  AiSignalChipComponent
} from '../../shared/components';
import { buildPageNumbers } from '../../shared/utils/pagination.utils';
import { dipScoreTextClasses } from '../../shared/utils/dip-signal-ui';
import { CurrencyDisplayPipe } from '../../shared/pipes/currency-display.pipe';
import { HoldingsPieChartComponent, PieGroupBy, DipInsightsCardComponent } from './components';

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
    HoldingsPieChartComponent,
    DipInsightsCardComponent,
    CurrencyDisplayPipe,
    AiSignalChipComponent
  ],
  templateUrl: './dashboard.page.html'
})
export class DashboardPageComponent implements OnInit, OnDestroy {
  private portfolioService = inject(PortfolioService);
  private quoteService = inject(QuoteService);
  private settingsService = inject(SettingsService);
  private plannerService = inject(PlannerService);
  private tourService = inject(TourService);
  private dialog = inject(DialogService);
  private router = inject(Router);
  private stockAnalysis = inject(StockAnalysisService);
  private dipSignals = inject(DipSignalService);
  readonly alertService = inject(PriceAlertService);
  public holdingsService = inject(HoldingsService);

  public themeService = inject(ThemeService);
  public lang = inject(LanguageService);
  private highlightTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Show data source popup after the tour finishes for first-time users
    effect(() => {
      if (this.tourService.justFinished()) {
        this.showDataSourceModal.set(true);
        this.tourService.consumeJustFinished();
      }
    });

    effect((onCleanup) => {
      const symbolsKey = this.portfolioService
        .stocks()
        .filter((s) => s.isActive)
        .map((s) => s.symbol)
        .sort()
        .join(',');
      const quotesHydrated = Object.keys(this.quoteService.quotes()).length > 0;

      untracked(() => {
        const stocks = this.scoringUniverse();
        if (!stocks.length) {
          this.dipPrediction.set(null);
          this.dipLoading.set(false);
          return;
        }

        const cached = this.dipSignals.readToday(stocks.map((s) => s.symbol));
        if (cached) {
          this.dipPrediction.set(cached.prediction);
          if (cached.prediction.provider === 'gemini') {
            this.dipLoading.set(false);
            return;
          }
        } else {
          this.dipPrediction.set(this.stockAnalysis.predictDips(stocks));
        }

        if (!quotesHydrated) {
          this.dipLoading.set(false);
          return;
        }

        this.dipLoading.set(true);
        const sub = this.stockAnalysis.fetchGeminiDipPredictions(stocks).subscribe((prediction) => {
          const currentKey = this.portfolioService
            .stocks()
            .filter((s) => s.isActive)
            .map((s) => s.symbol)
            .sort()
            .join(',');
          if (currentKey !== symbolsKey) return;

          const resolved = prediction ?? this.dipPrediction();
          if (prediction) {
            this.dipPrediction.set(prediction);
          }
          this.dipLoading.set(false);
          if (resolved?.picks.length) {
            this.dipSignals.persist(resolved);
          }
        });
        onCleanup(() => sub.unsubscribe());
      });
    });
  }

  // UI State
  selectedFolderId = signal<FolderId>('GROWTH_20');
  searchText = signal('');
  showRedOnly = signal(false);
  selectedSector = signal<string>('ALL');
  isLoading = signal(false);
  pieGroupBy = signal<PieGroupBy>('stock');
  showDataSourceModal = signal(false);
  highlightedSection = signal<string | null>(null);
  planNudge = signal<{ symbol: string; extraCount: number } | null>(null);
  dipPrediction = signal<DipPrediction | null>(null);
  dipLoading = signal(false);
  proxySources = signal({
    finnhub: false,
    alphavantage: false,
    yahoo: true,
    mock: true,
  });
  
  // Pagination
  currentPage = signal(1);
  pageSize = signal(10);
  pageSizeOptions = [10, 20, 50, 100];

  // Folder tabs
  folders = this.portfolioService.folders;

  // Unique sectors for current folder
  availableSectors = computed<string[]>(() => {
    const stocks = this.portfolioService.getStocksByFolder(this.selectedFolderId());
    const sectors = stocks.map(s => s.sector).filter((s): s is string => !!s);
    return ['ALL', ...Array.from(new Set(sectors)).sort()];
  });

  // Computed stock view models
  stockViewModels = computed<StockViewModel[]>(() => {
    const stocks = this.portfolioService.getStocksByFolder(this.selectedFolderId());
    const search = this.searchText().toLowerCase();
    const redOnly = this.showRedOnly();
    const sector = this.selectedSector();

    let vms = stocks.map(stock => this.toStockViewModel(stock));

    // Filter by sector
    if (sector !== 'ALL') {
      vms = vms.filter(v => v.sector === sector);
    }

    // Filter by search
    if (search) {
      vms = vms.filter(v =>
        v.symbol.toLowerCase().includes(search) ||
        v.displayName.toLowerCase().includes(search) ||
        (v.sector ?? '').toLowerCase().includes(search)
      );
    }

    // Filter by red only
    if (redOnly) {
      vms = vms.filter(v => v.isRed);
    }

    return vms;
  });

  /** All active watched names (both folders), used for daily AI Signal + Score. */
  scoringUniverse = computed<StockViewModel[]>(() => {
    const stocks = this.portfolioService
      .stocks()
      .filter((s) => s.isActive)
      .sort((a, b) => a.rank - b.rank || a.symbol.localeCompare(b.symbol))
      .slice(0, 30);
    return stocks.map((stock) => this.toStockViewModel(stock));
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

  dipBySymbol = computed(() => {
    const map = new Map<string, DipPick>();
    for (const pick of this.dipPrediction()?.picks ?? []) {
      map.set(pick.symbol, pick);
    }
    return map;
  });

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
  isStaleCache = this.quoteService.isStaleCache;

  readonly networkStatus = inject(NetworkStatusService);

  /** Human-readable cache age: "5 min ago", "2 hr ago", "3 days ago" */
  cacheAgeLabel = computed<string | null>(() => {
    const minutes = this.quoteService.cacheAgeMinutes();
    if (minutes === null) return null;
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours === 1 ? '1 hr ago' : `${hours} hr ago`;
    const days = Math.floor(hours / 24);
    return days === 1 ? '1 day ago' : `${days} days ago`;
  });

  ngOnInit(): void {
    this.loadQuotes();
    this.quoteService.getProxyCapabilities().subscribe(capabilities => {
      this.proxySources.set(capabilities);
    });

    // If the tour is already completed (returning user who cleared dh_welcome_shown),
    // show the popup immediately since the tour won't run to trigger it.
    // For first-time users (tour not completed), the effect() will show it after tour finishes.
    if (!localStorage.getItem('dh_welcome_shown') && this.tourService.isCompleted()) {
      this.showDataSourceModal.set(true);
    }
  }

  ngOnDestroy(): void {
    if (this.highlightTimer) {
      clearTimeout(this.highlightTimer);
      this.highlightTimer = null;
    }
  }

  async onChooseDataSource(source: QuoteDataSource): Promise<void> {
    if (!this.isSourceSelectable(source)) {
      const providerName = source === 'finnhub' ? 'Finnhub' : 'Alpha Vantage';
      await this.dialog.alert(
        `${providerName} is not configured on this server. Add a personal API key in Settings or ask the app admin to configure it before selecting this source.`,
        `${providerName} Unavailable`
      );
      return;
    }

    this.settingsService.updateSettings({ quoteDataSource: source });
    localStorage.setItem('dh_welcome_shown', '1');
    this.showDataSourceModal.set(false);
    // Clear any cached quotes from the initial load (which used the default source)
    // so the next fetch uses the correct source
    this.quoteService.clearCache();
    this.loadQuotes();
  }

  private isSourceSelectable(source: QuoteDataSource): boolean {
    if (source === 'yahoo' || source === 'mock') {
      return true;
    }

    const settings = this.settingsService.settings();
    const hasPersonalKey = source === 'finnhub'
      ? Boolean(settings.finnhubApiKey?.trim())
      : Boolean(settings.alphaVantageApiKey?.trim());

    return hasPersonalKey || this.proxySources()[source];
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
   * Refresh quotes (bypass cache) - fetch all 30 stocks at once
   */
  onRefresh(): void {
    this.isLoading.set(true);
    const symbols = this.portfolioService.getActiveSymbols();
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
    this.selectedSector.set('ALL');
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
   * Add stock to current month's editable (draft) plan.
   * Creates a new draft when the only plan(s) for the month are finalized.
   */
  async onAddToPlan(vm: StockViewModel): Promise<void> {
    const month = this.plannerService.currentMonth;
    const plan = this.plannerService.getOrCreatePlan(month);

    if (plan.status === 'FINAL') {
      await this.dialog.alert(
        'The current plan is finalized and cannot be edited. Create a new plan in Planner to add stocks.',
        'Plan Locked'
      );
      return;
    }

    const quote = this.quoteService.getQuote(vm.symbol);
    const item = this.plannerService.addItem(plan.id, vm.stockId, vm.symbol, quote);

    if (!item) {
      await this.dialog.alert(
        'Could not add this stock to the plan. It may already be included, or the plan is locked.',
        'Add Failed'
      );
      return;
    }

    // Always point people to Planner — the nav is easy to miss while scrolled
    // down the red-candidate list.
    const prev = this.planNudge();
    if (prev && prev.symbol !== vm.symbol) {
      this.planNudge.set({ symbol: prev.symbol, extraCount: prev.extraCount + 1 });
    } else {
      this.planNudge.set({ symbol: vm.symbol, extraCount: 0 });
    }
  }

  dismissPlanNudge(): void {
    this.planNudge.set(null);
  }

  openPlannerFromNudge(): void {
    this.planNudge.set(null);
    void this.router.navigate(['/planner']);
  }

  planNudgeMessage(): string {
    const nudge = this.planNudge();
    if (!nudge) return '';
    if (nudge.extraCount > 0) {
      return this.lang.t('dashboard.addedToPlanMany', {
        symbol: nudge.symbol,
        count: nudge.extraCount,
      });
    }
    return this.lang.t('dashboard.addedToPlanOne', { symbol: nudge.symbol });
  }

  /**
   * Toggle price alert for a stock.
   */
  async onToggleAlert(vm: StockViewModel): Promise<void> {
    if (this.settingsService.hasAlert(vm.symbol)) {
      this.settingsService.removeAlert(vm.symbol);
      return;
    }

    if (this.alertService.permissionStatus() !== 'granted') {
      const perm = await this.alertService.requestPermission();
      if (perm !== 'granted') return;
    }

    const defaultThreshold = -5;
    this.settingsService.setAlert(vm.symbol, defaultThreshold);
  }

  hasAlert(symbol: string): boolean {
    return this.settingsService.hasAlert(symbol);
  }

  jumpToSection(sectionId: string): void {
    const target = document.getElementById(sectionId);
    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.highlightedSection.set(sectionId);

    if (this.highlightTimer) {
      clearTimeout(this.highlightTimer);
    }

    this.highlightTimer = setTimeout(() => {
      this.highlightedSection.set(null);
      this.highlightTimer = null;
    }, 2000);
  }

  onCardKeydown(event: KeyboardEvent, sectionId: string): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.jumpToSection(sectionId);
  }

  isSectionHighlighted(sectionId: string): boolean {
    return this.highlightedSection() === sectionId;
  }

  formatPercent(value: number | undefined): string {
    if (value === undefined) return '-';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  dipScoreClasses(action: DipPick['action']): string {
    return dipScoreTextClasses(action, this.themeService.isDark());
  }

  private toStockViewModel(stock: Stock): StockViewModel {
    const quote = this.quoteService.quotes()[stock.symbol];
    const holding = this.holdingsService.holdingsMap()[stock.id];
    return {
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
      isRed: this.settingsService.isRed(quote),
      isInCurrentPlan: this.plannerService.isInCurrentPlan(stock.id),
      holdingQty: holding?.totalQty,
      avgPrice: holding?.avgPrice,
      investedAmount: holding?.investedAmount,
      currentValue: holding?.currentValue,
      unrealizedPL: holding?.unrealizedPL,
      unrealizedPLPercent: holding?.unrealizedPLPercent
    };
  }

  trackByStock(index: number, vm: StockViewModel): string {
    return vm.stockId;
  }
}
