/**
 * Holdings Pie Chart Component
 * Doughnut chart displaying holdings allocation by stock or folder
 */

import { 
  Component, 
  ElementRef, 
  ViewChild, 
  computed, 
  effect, 
  input,
  AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { Holding } from '../../../core/models';

// Register Chart.js components
Chart.register(...registerables);

export type PieGroupBy = 'stock' | 'folder';

interface ChartDataItem {
  label: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-holdings-pie-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative">
      <!-- Chart Container -->
      <div class="h-56">
        <canvas #pieCanvas></canvas>
      </div>
      
      <!-- Center Overlay -->
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div class="text-center">
          <p class="text-[10px] uppercase tracking-wide"
             [class.text-slate-400]="isDark()"
             [class.text-gray-500]="!isDark()">Total Value</p>
          <p class="text-lg font-bold"
             [class.text-white]="isDark()"
             [class.text-gray-900]="!isDark()">{{ formatCurrency(totalValue()) }}</p>
        </div>
      </div>

      <!-- Legend -->
      <div class="mt-4 grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
        @for (item of chartData(); track item.label) {
          <div class="flex items-center gap-2 text-xs">
            <span class="h-2.5 w-2.5 rounded-full shrink-0" [style.backgroundColor]="item.color"></span>
            <span class="truncate"
                  [class.text-slate-300]="isDark()"
                  [class.text-gray-700]="!isDark()">{{ item.label }}</span>
            <span class="ml-auto shrink-0"
                  [class.text-slate-400]="isDark()"
                  [class.text-gray-500]="!isDark()">{{ getPercent(item.value) }}%</span>
          </div>
        }
      </div>
    </div>
  `
})
export class HoldingsPieChartComponent implements AfterViewInit {
  @ViewChild('pieCanvas') pieCanvas!: ElementRef<HTMLCanvasElement>;

  // Inputs
  holdings = input.required<Holding[]>();
  groupBy = input<PieGroupBy>('stock');
  isDark = input<boolean>(true);

  private chart: Chart | null = null;

  // Color palette
  private colors = [
    '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
    '#14b8a6', '#6366f1', '#ec4899', '#84cc16', '#f97316',
    '#06b6d4', '#a855f7', '#22c55e', '#eab308', '#f43f5e',
    '#0ea5e9', '#d946ef', '#4ade80', '#facc15', '#fb7185'
  ];

  // Computed chart data
  chartData = computed<ChartDataItem[]>(() => {
    const holdings = this.holdings();
    const groupBy = this.groupBy();

    if (!holdings || holdings.length === 0) {
      return [];
    }

    if (groupBy === 'folder') {
      // Group by folder
      const folderMap = new Map<string, number>();
      holdings.forEach(h => {
        const folder = h.folderId === 'GROWTH_20' ? 'Growth 20' : 'Dividend 10';
        const current = folderMap.get(folder) || 0;
        folderMap.set(folder, current + (h.currentValue ?? h.investedAmount));
      });

      return Array.from(folderMap.entries()).map(([label, value], i) => ({
        label,
        value,
        color: this.colors[i % this.colors.length]
      }));
    } else {
      // Group by individual stock
      return holdings
        .filter(h => h.totalQty > 0)
        .map((h, i) => ({
          label: h.symbol,
          value: h.currentValue ?? h.investedAmount,
          color: this.colors[i % this.colors.length]
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 15); // Limit to top 15 for readability
    }
  });

  totalValue = computed(() => {
    const data = this.chartData();
    return data.reduce((sum, item) => sum + item.value, 0);
  });

  constructor() {
    // Rebuild chart when data or theme changes
    effect(() => {
      const data = this.chartData();
      const dark = this.isDark();
      // Delay to ensure canvas is ready
      setTimeout(() => this.buildChart(), 50);
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.buildChart(), 100);
  }

  private buildChart(): void {
    if (!this.pieCanvas?.nativeElement) return;

    // Destroy existing chart
    if (this.chart) {
      this.chart.destroy();
    }

    const data = this.chartData();
    if (data.length === 0) return;

    const isDark = this.isDark();
    const textColor = isDark ? '#94a3b8' : '#64748b';

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          data: data.map(d => d.value),
          backgroundColor: data.map(d => d.color),
          borderColor: isDark ? '#1e293b' : '#ffffff',
          borderWidth: 2,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            display: false // Using custom legend
          },
          tooltip: {
            backgroundColor: isDark ? '#334155' : '#ffffff',
            titleColor: isDark ? '#f1f5f9' : '#1e293b',
            bodyColor: isDark ? '#cbd5e1' : '#475569',
            borderColor: isDark ? '#475569' : '#e2e8f0',
            borderWidth: 1,
            padding: 10,
            displayColors: true,
            callbacks: {
              label: (context) => {
                const value = context.parsed;
                const total = this.totalValue();
                const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                return ` ${this.formatCurrency(value)} (${percent}%)`;
              }
            }
          }
        }
      }
    };

    this.chart = new Chart(this.pieCanvas.nativeElement, config);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  getPercent(value: number): string {
    const total = this.totalValue();
    if (total === 0) return '0';
    return ((value / total) * 100).toFixed(1);
  }
}
