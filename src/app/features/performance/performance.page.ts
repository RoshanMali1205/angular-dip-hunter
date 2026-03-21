/**
 * Performance Page Component
 * Main page for viewing stock/folder performance over time ranges
 */

import { Component, OnInit, computed, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  HistoryRange, 
  HistoricalPoint,
  PerformanceSummary,
  StockComparison,
  TIME_RANGE_OPTIONS 
} from '../../core/models/performance.model';
import { Stock } from '../../core/models/stock.model';
import { FolderId } from '../../core/models/folder.model';
import { PerformanceService } from '../../core/services/performance.service';
import { PortfolioService } from '../../core/services/portfolio.service';
import { ThemeService } from '../../core/services/theme.service';
import { LanguageService } from '../../core/services/language.service';
import { 
  TimeRangeSelectorComponent,
  PerformanceChartComponent,
  PerformanceSummaryCardsComponent,
  CompareStocksSelectorComponent,
  PerformanceTableSnapshotComponent
} from './components';

// Chart colors for comparison
const CHART_COLORS = [
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
];

@Component({
  selector: 'app-performance-page',
  standalone: true,
  imports: [
    CommonModule,
    TimeRangeSelectorComponent,
    PerformanceChartComponent,
    PerformanceSummaryCardsComponent,
    CompareStocksSelectorComponent,
    PerformanceTableSnapshotComponent
  ],
  templateUrl: './performance.page.html'
})
export class PerformancePageComponent implements OnInit {
  // Services
  readonly lang = inject(LanguageService);
  readonly themeService = inject(ThemeService);
  private readonly performanceService = inject(PerformanceService);
  private readonly portfolioService = inject(PortfolioService);
  
  // View state
  viewMode = signal<'single' | 'multistock' | 'sector'>('single');
  selectedRange = signal<HistoryRange>('30D');
  selectedFolder = signal<FolderId>('GROWTH_20');
  selectedStockId = signal<string>('');
  selectedCompareStocks = signal<string[]>([]);
  selectedSector = signal<string>('');
  showAggregate = signal(false);
  normalizeChart = signal(false);
  chartType = signal<'line' | 'area'>('line');
  
  // Loading state
  isLoading = signal(false);
  error = signal<string | null>(null);
  
  // Data
  singleStockData = signal<HistoricalPoint[]>([]);
  comparisonData = signal<StockComparison[]>([]);
  aggregateData = signal<HistoricalPoint[]>([]);
  
  // Computed
  folderStocks = computed(() => {
    const folder = this.selectedFolder();
    if (folder === 'GROWTH_20') {
      return this.portfolioService.growth20Stocks();
    }
    return this.portfolioService.dividend10Stocks();
  });
  
  // Get unique sectors from folder stocks
  availableSectors = computed(() => {
    const stocks = this.folderStocks();
    const sectors = [...new Set(stocks.map(s => s.sector).filter(Boolean))] as string[];
    return sectors.sort();
  });
  
  // Get stocks by selected sector
  sectorStocks = computed(() => {
    const sector = this.selectedSector();
    if (!sector) return [];
    return this.folderStocks().filter(s => s.sector === sector);
  });
  
  selectedStock = computed(() => {
    const stockId = this.selectedStockId();
    return this.folderStocks().find(s => s.id === stockId) || null;
  });
  
  singleStockSummary = computed(() => {
    const data = this.singleStockData();
    return this.performanceService.calculateSummary(data);
  });
  
  folderAggregateSummary = computed((): PerformanceSummary | null => {
    const comparisons = this.comparisonData();
    if (comparisons.length === 0) return null;
    
    // Calculate equal-weight average performance
    const validComparisons = comparisons.filter(c => c.summary);
    if (validComparisons.length === 0) return null;
    
    const avgStartPrice = validComparisons.reduce((sum, c) => sum + (c.summary?.startPrice || 0), 0) / validComparisons.length;
    const avgEndPrice = validComparisons.reduce((sum, c) => sum + (c.summary?.endPrice || 0), 0) / validComparisons.length;
    const absoluteChange = avgEndPrice - avgStartPrice;
    const percentageChange = avgStartPrice > 0 ? (absoluteChange / avgStartPrice) * 100 : 0;
    
    return {
      startPrice: avgStartPrice,
      endPrice: avgEndPrice,
      absoluteChange,
      percentageChange,
      highPrice: Math.max(...validComparisons.map(c => c.summary?.highPrice || 0)),
      lowPrice: Math.min(...validComparisons.filter(c => c.summary?.lowPrice).map(c => c.summary!.lowPrice)),
      avgPrice: (avgStartPrice + avgEndPrice) / 2
    };
  });
  
  constructor() {
    // Effect to load data when selections change
    effect(() => {
      // Track dependencies
      const range = this.selectedRange();
      const folder = this.selectedFolder();
      const stockId = this.selectedStockId();
      const compareStocks = this.selectedCompareStocks();
      const mode = this.viewMode();
      const sector = this.selectedSector();
      
      // Trigger load
      this.loadData();
    }, { allowSignalWrites: true });
  }
  
  ngOnInit(): void {
    // Select first stock by default
    const stocks = this.folderStocks();
    if (stocks.length > 0 && !this.selectedStockId()) {
      this.selectedStockId.set(stocks[0].id);
    }
    
    // Select top 3 for comparison by default
    if (stocks.length >= 3) {
      this.selectedCompareStocks.set(stocks.slice(0, 3).map(s => s.id));
    }
    
    // Select first sector by default
    const sectors = this.availableSectors();
    if (sectors.length > 0 && !this.selectedSector()) {
      this.selectedSector.set(sectors[0]);
    }
  }
  
  onRangeChange(range: HistoryRange): void {
    this.selectedRange.set(range);
  }
  
  onFolderChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedFolder.set(select.value as FolderId);
    
    // Reset stock selection
    const stocks = this.folderStocks();
    if (stocks.length > 0) {
      this.selectedStockId.set(stocks[0].id);
      this.selectedCompareStocks.set(stocks.slice(0, 3).map(s => s.id));
    }
    
    // Reset sector selection
    const sectors = this.availableSectors();
    if (sectors.length > 0) {
      this.selectedSector.set(sectors[0]);
    }
  }
  
  onStockChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedStockId.set(select.value);
  }
  
  onSectorChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedSector.set(select.value);
  }
  
  onCompareSelectionChange(stockIds: string[]): void {
    this.selectedCompareStocks.set(stockIds);
  }
  
  getRangeLabel(): string {
    const option = TIME_RANGE_OPTIONS.find(o => o.value === this.selectedRange());
    if (!option) return '';
    
    switch (option.value) {
      case '1W': return this.lang.t('performance.lastWeek');
      case '30D': return this.lang.t('performance.last30Days');
      case '1M': return this.lang.t('performance.last1Month');
      case '3M': return this.lang.t('performance.last3Months');
      case '6M': return this.lang.t('performance.last6Months');
      case '5Y': return this.lang.t('performance.last5Years');
      default: return '';
    }
  }
  
  async loadData(): Promise<void> {
    const range = this.selectedRange();
    const mode = this.viewMode();
    
    this.isLoading.set(true);
    this.error.set(null);
    
    try {
      if (mode === 'single') {
        await this.loadSingleStockData(range);
      } else if (mode === 'multistock') {
        await this.loadComparisonData(range);
      } else if (mode === 'sector') {
        await this.loadSectorComparisonData(range);
      }
    } catch (err) {
      this.error.set('Failed to load performance data');
    } finally {
      this.isLoading.set(false);
    }
  }
  
  private async loadSingleStockData(range: HistoryRange): Promise<void> {
    const stock = this.selectedStock();
    if (!stock) {
      this.singleStockData.set([]);
      return;
    }
    
    const history = await this.performanceService.getHistory(stock.symbol, range);
    if (history) {
      this.singleStockData.set(history.points);
    } else {
      this.singleStockData.set([]);
    }
  }
  
  private async loadComparisonData(range: HistoryRange): Promise<void> {
    const selectedIds = this.selectedCompareStocks();
    const stocks = this.folderStocks();
    const selectedStocks = stocks.filter(s => selectedIds.includes(s.id));
    
    if (selectedStocks.length === 0) {
      this.comparisonData.set([]);
      this.aggregateData.set([]);
      return;
    }
    
    const symbols = selectedStocks.map(s => s.symbol);
    const historyMap = await this.performanceService.getMultipleHistory(symbols, range);
    
    // Build comparison data
    const comparisons: StockComparison[] = selectedStocks.map((stock, index) => {
      const history = historyMap.get(stock.symbol);
      const points = history?.points || [];
      
      return {
        stockId: stock.id,
        symbol: stock.symbol,
        displayName: stock.displayName,
        color: CHART_COLORS[index % CHART_COLORS.length],
        data: points,
        summary: this.performanceService.calculateSummary(points)
      };
    });
    
    this.comparisonData.set(comparisons);
    
    // Calculate aggregate
    const aggregate = this.performanceService.calculateAggregatePerformance(historyMap);
    this.aggregateData.set(aggregate);
  }
  
  private async loadSectorComparisonData(range: HistoryRange): Promise<void> {
    const sectorStocks = this.sectorStocks();
    
    if (sectorStocks.length === 0) {
      this.comparisonData.set([]);
      this.aggregateData.set([]);
      return;
    }
    
    const symbols = sectorStocks.map(s => s.symbol);
    const historyMap = await this.performanceService.getMultipleHistory(symbols, range);
    
    // Build comparison data for sector stocks
    const comparisons: StockComparison[] = sectorStocks.map((stock, index) => {
      const history = historyMap.get(stock.symbol);
      const points = history?.points || [];
      
      return {
        stockId: stock.id,
        symbol: stock.symbol,
        displayName: stock.displayName,
        color: CHART_COLORS[index % CHART_COLORS.length],
        data: points,
        summary: this.performanceService.calculateSummary(points)
      };
    });
    
    this.comparisonData.set(comparisons);
    
    // Calculate aggregate for sector
    const aggregate = this.performanceService.calculateAggregatePerformance(historyMap);
    this.aggregateData.set(aggregate);
  }
}
