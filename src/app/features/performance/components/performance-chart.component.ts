/**
 * Performance Chart Component
 * Line chart displaying historical price data using Chart.js
 */

import { 
  Component, 
  input,
  output,
  effect, 
  ViewChild, 
  ElementRef, 
  OnDestroy,
  computed,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { HistoricalPoint, StockComparison } from '../../../core/models/performance.model';
import { ThemeService } from '../../../core/services/theme.service';
import { CurrencyService } from '../../../core/services/currency.service';

// Register Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-performance-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full" [style.height]="height()">
      <!-- Loading Skeleton -->
      @if (isLoading()) {
        <div class="absolute inset-0 flex items-center justify-center rounded-lg animate-pulse"
             [class.bg-slate-800]="themeService.isDark()"
             [class.bg-gray-200]="themeService.isLight()">
          <div class="text-center">
            <svg class="animate-spin h-8 w-8 mx-auto mb-2"
                 [class.text-slate-600]="themeService.isDark()"
                 [class.text-gray-400]="themeService.isLight()"
                 xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="text-sm"
               [class.text-slate-400]="themeService.isDark()"
               [class.text-gray-500]="themeService.isLight()">
              Loading chart...
            </p>
          </div>
        </div>
      }
      
      <!-- Error State -->
      @if (error() && !isLoading()) {
        <div class="absolute inset-0 flex items-center justify-center rounded-lg"
             [class.bg-slate-800/50]="themeService.isDark()"
             [class.bg-gray-100]="themeService.isLight()">
          <div class="text-center p-4">
            <svg class="h-12 w-12 mx-auto mb-2 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p class="text-sm text-red-400 mb-2">{{ error() }}</p>
            <button 
              (click)="retryClick.emit()"
              class="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition">
              Retry
            </button>
          </div>
        </div>
      }
      
      <!-- Chart Canvas -->
      <canvas #chartCanvas 
              [class.opacity-0]="isLoading() || error()"
              class="transition-opacity duration-300"></canvas>
    </div>
  `
})
export class PerformanceChartComponent implements OnDestroy {
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  private currencyService = inject(CurrencyService);
  
  // Inputs
  data = input<HistoricalPoint[]>([]);
  comparisons = input<StockComparison[]>([]);
  aggregateData = input<HistoricalPoint[] | null>(null);
  showAggregate = input(false);
  isLoading = input(false);
  error = input<string | null>(null);
  height = input('300px');
  chartType = input<'line' | 'area'>('line');
  showMarkers = input(false);
  normalized = input(false);
  
  // Outputs
  retryClick = output<void>();
  
  private chart: Chart | null = null;
  
  constructor(public themeService: ThemeService) {
    // Effect to rebuild chart when data changes
    effect(() => {
      const chartData = this.data();
      const comps = this.comparisons();
      const aggData = this.aggregateData();
      const showAgg = this.showAggregate();
      const isDark = this.themeService.isDark();
      const type = this.chartType();
      const markers = this.showMarkers();
      const isNormalized = this.normalized();
      
      // Trigger rebuild
      setTimeout(() => this.buildChart(), 50);
    });
  }
  
  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }
  
  private buildChart(): void {
    if (!this.chartCanvas?.nativeElement) return;
    
    if (this.chart) {
      this.chart.destroy();
    }
    
    const comparisons = this.comparisons();
    const singleData = this.data();
    const aggData = this.aggregateData();
    const showAgg = this.showAggregate();
    
    const isDark = this.themeService.isDark();
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';
    
    // Determine datasets
    const datasets: any[] = [];
    
    // If we have comparison data, use that
    if (comparisons.length > 0) {
      comparisons.forEach((comp, index) => {
        const data = this.normalized() ? this.normalizeData(comp.data) : comp.data;
        datasets.push(this.createDataset(
          comp.symbol,
          data,
          comp.color,
          index === 0
        ));
      });
      
      // Add aggregate line if enabled
      if (showAgg && aggData && aggData.length > 0) {
        const normalizedAgg = this.normalized() ? this.normalizeData(aggData) : aggData;
        datasets.push(this.createDataset(
          'Aggregate',
          normalizedAgg,
          '#8b5cf6', // Purple for aggregate
          false,
          true // Dashed line
        ));
      }
    } else if (singleData.length > 0) {
      // Single stock data
      const data = this.normalized() ? this.normalizeData(singleData) : singleData;
      datasets.push(this.createDataset(
        'Price',
        data,
        '#10b981', // Emerald
        true
      ));
    }
    
    if (datasets.length === 0) return;
    
    // Get labels from first dataset
    const labels = datasets[0]?.data?.map((d: any) => d.date) || [];
    
    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: datasets.map(ds => ({
          ...ds,
          data: ds.data.map((d: HistoricalPoint) => d.close)
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            display: comparisons.length > 1 || showAgg,
            position: 'top',
            labels: {
              color: textColor,
              usePointStyle: true,
              padding: 15,
              font: { size: 11 }
            }
          },
          tooltip: {
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            titleColor: isDark ? '#f1f5f9' : '#1e293b',
            bodyColor: isDark ? '#cbd5e1' : '#475569',
            borderColor: isDark ? '#334155' : '#e2e8f0',
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                if (this.normalized()) {
                  return `${context.dataset.label}: ${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
                }
                return `${context.dataset.label}: ${this.currencyService.formatDisplay(value)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: gridColor,
              display: false
            },
            ticks: {
              color: textColor,
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 8,
              font: { size: 10 }
            }
          },
          y: {
            grid: {
              color: gridColor
            },
            ticks: {
              color: textColor,
              font: { size: 10 },
              callback: (value) => {
                if (this.normalized()) {
                  return `${Number(value) >= 0 ? '+' : ''}${value}%`;
                }
                return this.currencyService.formatDisplay(Number(value));
              }
            }
          }
        }
      }
    };
    
    this.chart = new Chart(this.chartCanvas.nativeElement, config);
  }
  
  private createDataset(
    label: string, 
    data: HistoricalPoint[], 
    color: string, 
    fill: boolean = false,
    dashed: boolean = false
  ): any {
    const isArea = this.chartType() === 'area' && fill;
    
    return {
      label,
      data,
      borderColor: color,
      backgroundColor: isArea ? `${color}20` : color,
      fill: isArea,
      tension: 0.3,
      pointRadius: this.showMarkers() ? 3 : 0,
      pointHoverRadius: 5,
      borderWidth: 2,
      borderDash: dashed ? [5, 5] : []
    };
  }
  
  private normalizeData(data: HistoricalPoint[]): HistoricalPoint[] {
    if (!data || data.length === 0) return [];
    
    const startPrice = data[0].close;
    return data.map(p => ({
      date: p.date,
      close: startPrice > 0 ? ((p.close - startPrice) / startPrice) * 100 : 0
    }));
  }
}
