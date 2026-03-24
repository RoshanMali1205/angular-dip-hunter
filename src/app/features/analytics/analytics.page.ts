import { Component, OnInit, computed, signal, ViewChild, ElementRef, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { TransactionService } from '../../core/services/transaction.service';
import { HoldingsService } from '../../core/services/holdings.service';
import { PortfolioService } from '../../core/services/portfolio.service';
import { QuoteService } from '../../core/services/quote.service';
import { ThemeService } from '../../core/services/theme.service';
import { LanguageService } from '../../core/services/language.service';
import { FolderId } from '../../core/models/folder.model';
import { HoldingsSummary, Holding } from '../../core/models/holding.model';
import { BuyTransaction, DividendTransaction } from '../../core/models/transaction.model';
import { SkeletonCardComponent } from '../../shared/components';

// Register Chart.js components
Chart.register(...registerables);

interface MonthlyTotals {
  month: string;
  buyAmount: number;
  dividendAmount: number;
  netInvested: number;
}

interface AllocationData {
  symbol: string;
  value: number;
  percentage: number;
  color: string;
}

interface SectorAllocationData {
  sector: string;
  value: number;
  percentage: number;
  stockCount: number;
  color: string;
}

@Component({
  selector: 'app-analytics-page',
  standalone: true,
  imports: [CommonModule, SkeletonCardComponent],
  templateUrl: './analytics.page.html'
})
export class AnalyticsPageComponent implements OnInit, AfterViewInit {
  @ViewChild('allocationPieChart') allocationPieChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('monthlyLineChart') monthlyLineChartRef!: ElementRef<HTMLCanvasElement>;
  
  readonly lang = inject(LanguageService);
  
  private allocationChart: Chart | null = null;
  private monthlyChart: Chart | null = null;
  
  // State
  selectedFolder = signal<FolderId | 'ALL'>('ALL');
  isLoading = signal(false);
  
  // Holdings data
  growthHoldings = signal<Holding[]>([]);
  dividendHoldings = signal<Holding[]>([]);
  growthSummary = signal<HoldingsSummary | null>(null);
  dividendSummary = signal<HoldingsSummary | null>(null);
  
  // Transaction data (use getters to avoid initialization issues)
  get buyTransactions() { return this.transactionService.buyTransactions; }
  get dividendTransactions() { return this.transactionService.dividendTransactions; }
  
  // Combined summary
  totalSummary = computed(() => {
    const growth = this.growthSummary();
    const dividend = this.dividendSummary();
    
    if (!growth && !dividend) return null;
    
    const totalCost = (growth?.totalInvested || 0) + (dividend?.totalInvested || 0);
    const totalValue = (growth?.totalCurrentValue || 0) + (dividend?.totalCurrentValue || 0);
    const totalPL = (growth?.totalUnrealizedPL || 0) + (dividend?.totalUnrealizedPL || 0);
    const totalDividends = (growth?.totalDividends || 0) + (dividend?.totalDividends || 0);
    
    return {
      totalCost,
      totalValue,
      totalUnrealizedPL: totalPL,
      totalUnrealizedPLPercent: totalCost > 0 ? (totalPL / totalCost) * 100 : 0,
      totalDividends,
      growthValue: growth?.totalCurrentValue || 0,
      dividendValue: dividend?.totalCurrentValue || 0
    };
  });
  
  // Chart time range
  chartRange = signal<'3M' | '6M' | '1Y' | 'ALL'>('1Y');

  // Monthly totals
  monthlyTotals = computed(() => {
    const buys = this.buyTransactions();
    const divs = this.dividendTransactions();
    const folder = this.selectedFolder();
    
    // Note: Transactions don't have folderId, so we show all for now
    const filteredBuys = buys;
    const filteredDivs = divs;
    
    const monthMap = new Map<string, MonthlyTotals>();
    
    // Process buys
    filteredBuys.forEach(tx => {
      const month = tx.date.substring(0, 7); // YYYY-MM
      const existing = monthMap.get(month) || { month, buyAmount: 0, dividendAmount: 0, netInvested: 0 };
      existing.buyAmount += tx.totalAmount;
      monthMap.set(month, existing);
    });
    
    // Process dividends
    filteredDivs.forEach(tx => {
      const month = tx.date.substring(0, 7);
      const existing = monthMap.get(month) || { month, buyAmount: 0, dividendAmount: 0, netInvested: 0 };
      existing.dividendAmount += tx.amount;
      monthMap.set(month, existing);
    });
    
    // Calculate net invested
    const result = Array.from(monthMap.values()).map(m => ({
      ...m,
      netInvested: m.buyAmount - m.dividendAmount
    }));
    
    // Sort by month descending
    return result.sort((a, b) => b.month.localeCompare(a.month));
  });
  
  // Chart data filtered by range (ascending order for display)
  chartMonthlyData = computed(() => {
    const ascending = this.monthlyTotals().slice().reverse();
    const range = this.chartRange();
    if (range === 'ALL') return ascending;
    const months = range === '3M' ? 3 : range === '6M' ? 6 : 12;
    return ascending.slice(-months);
  });

  hasChartData = computed(() =>
    this.chartMonthlyData().some(m => m.buyAmount > 0 || m.dividendAmount > 0)
  );

  // Allocation data for charts
  growthAllocation = computed(() => {
    const holdings = this.growthHoldings();
    const totalValue = holdings.reduce((sum, h) => sum + (h.currentValue || 0), 0);
    
    return holdings.map((h, i) => ({
      symbol: h.symbol,
      value: h.currentValue || 0,
      percentage: totalValue > 0 ? ((h.currentValue || 0) / totalValue) * 100 : 0,
      color: this.getColor(i)
    })).sort((a, b) => b.value - a.value);
  });
  
  dividendAllocation = computed(() => {
    const holdings = this.dividendHoldings();
    const totalValue = holdings.reduce((sum, h) => sum + (h.currentValue || 0), 0);
    
    return holdings.map((h, i) => ({
      symbol: h.symbol,
      value: h.currentValue || 0,
      percentage: totalValue > 0 ? ((h.currentValue || 0) / totalValue) * 100 : 0,
      color: this.getColor(i)
    })).sort((a, b) => b.value - a.value);
  });
  
  // Sector allocation — groups all holdings by sector
  sectorAllocation = computed<SectorAllocationData[]>(() => {
    const allHoldings = [...this.growthHoldings(), ...this.dividendHoldings()];
    const stocks = this.portfolioService.activeStocks();
    const sectorMap = new Map<string, { value: number; count: number }>();

    for (const holding of allHoldings) {
      const stock = stocks.find(s => s.id === holding.stockId);
      const sector = stock?.sector ?? 'Other';
      const value = holding.currentValue ?? holding.investedAmount;
      const existing = sectorMap.get(sector) ?? { value: 0, count: 0 };
      sectorMap.set(sector, { value: existing.value + value, count: existing.count + 1 });
    }

    const totalValue = Array.from(sectorMap.values()).reduce((sum, s) => sum + s.value, 0);
    const result = Array.from(sectorMap.entries())
      .map(([sector, data], i) => ({
        sector,
        value: data.value,
        stockCount: data.count,
        percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
        color: this.getColor(i)
      }))
      .sort((a, b) => b.value - a.value);

    return result;
  });

  // YTD totals
  ytdTotals = computed(() => {
    const currentYear = new Date().getFullYear().toString();
    const monthly = this.monthlyTotals().filter(m => m.month.startsWith(currentYear));
    
    return {
      buyAmount: monthly.reduce((sum, m) => sum + m.buyAmount, 0),
      dividendAmount: monthly.reduce((sum, m) => sum + m.dividendAmount, 0),
      netInvested: monthly.reduce((sum, m) => sum + m.netInvested, 0)
    };
  });
  
  constructor(
    private transactionService: TransactionService,
    private holdingsService: HoldingsService,
    private portfolioService: PortfolioService,
    private quoteService: QuoteService,
    public themeService: ThemeService
  ) {}
  
  ngOnInit(): void {
    this.loadData();
  }
  
  ngAfterViewInit(): void {
    // Charts will be initialized after data loads
    setTimeout(() => this.initCharts(), 100);
  }
  
  private initCharts(): void {
    this.initAllocationChart();
    this.initMonthlyChart();
  }
  
  private initAllocationChart(): void {
    if (!this.allocationPieChartRef?.nativeElement) return;
    
    if (this.allocationChart) {
      this.allocationChart.destroy();
    }
    
    const allHoldings = [...this.growthHoldings(), ...this.dividendHoldings()];
    const labels = allHoldings.map(h => h.symbol);
    const data = allHoldings.map(h => h.currentValue || 0);
    const colors = allHoldings.map((_, i) => this.getColor(i));
    
    const isDark = this.themeService.isDark();
    const textColor = isDark ? '#94a3b8' : '#64748b';
    
    this.allocationChart = new Chart(this.allocationPieChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: isDark ? '#1e293b' : '#ffffff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: textColor,
              padding: 10,
              usePointStyle: true,
              font: { size: 12 }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                const total = data.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                return `${context.label}: ₹${value.toFixed(2)} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }
  
  private initMonthlyChart(): void {
    if (!this.monthlyLineChartRef?.nativeElement) return;
    
    if (this.monthlyChart) {
      this.monthlyChart.destroy();
    }
    
    const monthlyData = this.chartMonthlyData();
    const labels = monthlyData.map(m => this.formatMonth(m.month));
    const buyData = monthlyData.map(m => m.buyAmount);
    const dividendData = monthlyData.map(m => m.dividendAmount);
    
    const isDark = this.themeService.isDark();
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';
    
    this.monthlyChart = new Chart(this.monthlyLineChartRef.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Investments',
            data: buyData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.3
          },
          {
            label: 'Dividends',
            data: dividendData,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { color: textColor, font: { size: 12 } },
            grid: { color: gridColor }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: textColor,
              font: { size: 12 },
              callback: (value) => '₹' + value
            },
            grid: { color: gridColor }
          }
        },
        plugins: {
          legend: {
            labels: { color: textColor, font: { size: 12 } }
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ₹${(context.raw as number).toFixed(2)}`
            }
          }
        }
      }
    });
  }
  
  updateCharts(): void {
    this.updateAllocationChart();
    this.updateMonthlyChart();
  }

  private updateAllocationChart(): void {
    if (!this.allocationChart) {
      this.initAllocationChart();
      return;
    }
    const allHoldings = [...this.growthHoldings(), ...this.dividendHoldings()];
    this.allocationChart.data.labels = allHoldings.map(h => h.symbol);
    this.allocationChart.data.datasets[0].data = allHoldings.map(h => h.currentValue || 0);
    this.allocationChart.data.datasets[0].backgroundColor = allHoldings.map((_, i) => this.getColor(i));
    this.allocationChart.update();
  }

  private updateMonthlyChart(): void {
    if (!this.monthlyChart) {
      this.initMonthlyChart();
      return;
    }
    const monthlyData = this.chartMonthlyData();
    this.monthlyChart.data.labels = monthlyData.map(m => this.formatMonth(m.month));
    this.monthlyChart.data.datasets[0].data = monthlyData.map(m => m.buyAmount);
    this.monthlyChart.data.datasets[1].data = monthlyData.map(m => m.dividendAmount);
    this.monthlyChart.update();
  }
  
  async loadData(): Promise<void> {
    this.isLoading.set(true);
    try {
      const symbols = this.portfolioService.getActiveSymbols();
      // fetchQuotes updates the quotes signal; holdings computed auto-reacts
      await this.quoteService.fetchQuotes(symbols);

      // Get holdings by folder
      const allHoldings = this.holdingsService.holdings();
      this.growthHoldings.set(allHoldings.filter(h => h.folderId === 'GROWTH_20'));
      this.dividendHoldings.set(allHoldings.filter(h => h.folderId === 'DIVIDEND_10'));
      
      // Calculate summaries per folder
      const growthList = this.growthHoldings();
      const dividendList = this.dividendHoldings();
      
      this.growthSummary.set(this.calculateSummary(growthList));
      this.dividendSummary.set(this.calculateSummary(dividendList));
    } finally {
      this.isLoading.set(false);
    }
  }
  
  private calculateSummary(holdings: Holding[]): HoldingsSummary {
    const totalInvested = holdings.reduce((sum, h) => sum + h.investedAmount, 0);
    const totalCurrentValue = holdings.reduce((sum, h) => sum + (h.currentValue || h.investedAmount), 0);
    const totalDividends = holdings.reduce((sum, h) => sum + h.totalDividends, 0);
    const totalUnrealizedPL = totalCurrentValue - totalInvested;
    const totalUnrealizedPLPercent = totalInvested > 0 ? (totalUnrealizedPL / totalInvested) * 100 : 0;
    
    return {
      totalInvested,
      totalCurrentValue,
      totalUnrealizedPL,
      totalUnrealizedPLPercent,
      totalDividends,
      holdingsCount: holdings.filter(h => h.totalQty > 0).length
    };
  }
  
  setFolder(folder: FolderId | 'ALL'): void {
    this.selectedFolder.set(folder);
  }

  readonly chartRanges: Array<'3M' | '6M' | '1Y' | 'ALL'> = ['3M', '6M', '1Y', 'ALL'];

  setChartRange(range: '3M' | '6M' | '1Y' | 'ALL'): void {
    this.chartRange.set(range);
    setTimeout(() => this.updateMonthlyChart(), 0);
  }
  
  // Color palette for charts
  private getColor(index: number): string {
    const colors = [
      '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
      '#14b8a6', '#6366f1', '#ec4899', '#84cc16', '#f97316',
      '#06b6d4', '#a855f7', '#22c55e', '#eab308', '#f43f5e',
      '#0ea5e9', '#d946ef', '#4ade80', '#facc15', '#fb7185'
    ];
    return colors[index % colors.length];
  }
  
  // Formatting
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }
  
  formatPercent(value: number): string {
    return (value >= 0 ? '+' : '') + value.toFixed(2) + '%';
  }
  
  formatMonth(monthStr: string): string {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  
  // Track by
  trackByMonth(index: number, item: MonthlyTotals): string {
    return item.month;
  }
  
  trackByAllocation(index: number, item: AllocationData): string {
    return item.symbol;
  }

  trackBySector(index: number, item: SectorAllocationData): string {
    return item.sector;
  }
}
