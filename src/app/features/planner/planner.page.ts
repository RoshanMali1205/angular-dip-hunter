/**
 * Planner Page Component
 * Create and manage monthly purchase plans
 */

import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlannerService, QuoteService, PortfolioService, SettingsService, LanguageService, ThemeService, DraftsService } from '../../core/services';
import { TransactionService } from '../../core/services/transaction.service';
import { MonthlyPlan, PlanItem, AdvisorStrategy, AllocationSuggestion } from '../../core/models/plan.model';
import { StockViewModel } from '../../core/models';
import { AllocationSuggestionsComponent } from './components';

@Component({
  selector: 'app-planner-page',
  standalone: true,
  imports: [CommonModule, FormsModule, AllocationSuggestionsComponent],
  templateUrl: './planner.page.html'
})
export class PlannerPageComponent implements OnInit {
  private plannerService = inject(PlannerService);
  private quoteService = inject(QuoteService);
  private portfolioService = inject(PortfolioService);
  private settingsService = inject(SettingsService);
  private transactionService = inject(TransactionService);
  private draftsService = inject(DraftsService);
  readonly lang = inject(LanguageService);
  readonly themeService = inject(ThemeService);

  readonly draftCount = this.draftsService.draftCount;
  readonly canSaveDraft = this.draftsService.canCreate;

  // UI State
  selectedMonth = signal(this.plannerService.currentMonth);
  budget = signal(50000);
  isLoading = signal(false);
  selectedAllocationStrategy = signal<AdvisorStrategy>('equal');

  currentPlan = computed(() => 
    this.plannerService.getPlanForMonth(this.selectedMonth())
  );

  isPlanLocked = computed(() => 
    this.currentPlan()?.status === 'FINAL'
  );

  // Red stocks available for planning
  availableRedStocks = computed<StockViewModel[]>(() => {
    const stocks = this.portfolioService.activeStocks();
    const quotes = this.quoteService.quotes();
    const plan = this.currentPlan();
    const planStockIds = new Set(plan?.items.map(i => i.stockId) || []);

    return stocks
      .filter(stock => {
        const quote = quotes[stock.symbol];
        const isRed = this.settingsService.isRed(quote);
        const notInPlan = !planStockIds.has(stock.id);
        return isRed && notInPlan;
      })
      .map(stock => {
        const quote = quotes[stock.symbol];
        return {
          stockId: stock.id,
          symbol: stock.symbol,
          displayName: stock.displayName,
          folderId: stock.folderId,
          rank: stock.rank,
          isActive: stock.isActive,
          price: quote?.price,
          change: quote?.change,
          changePercent: quote?.changePercent,
          isRed: true,
          isInCurrentPlan: false
        } as StockViewModel;
      });
  });

  ngOnInit(): void {
    this.loadQuotes();
  }

  loadQuotes(): void {
    this.isLoading.set(true);
    const symbols = this.portfolioService.getActiveSymbols();
    this.quoteService.fetchQuotes(symbols).subscribe({
      next: () => this.isLoading.set(false),
      error: () => this.isLoading.set(false)
    });
  }

  onMonthChange(month: string): void {
    this.selectedMonth.set(month);
  }

  onCreatePlan(): void {
    this.plannerService.getOrCreatePlan(this.selectedMonth());
  }

  onAddItem(vm: StockViewModel): void {
    const plan = this.currentPlan();
    if (!plan || plan.status === 'FINAL') return;

    const quote = this.quoteService.getQuote(vm.symbol);
    this.plannerService.addItem(plan.id, vm.stockId, vm.symbol, quote);
  }

  onRemoveItem(item: PlanItem): void {
    const plan = this.currentPlan();
    if (!plan || plan.status === 'FINAL') return;

    this.plannerService.removeItem(plan.id, item.stockId);
  }

  onUpdateBudget(): void {
    const plan = this.currentPlan();
    if (!plan || plan.status === 'FINAL') return;

    this.plannerService.updatePlan(plan.id, { budget: this.budget() });
  }

  onApplyEqualWeight(): void {
    const plan = this.currentPlan();
    if (!plan || plan.status === 'FINAL') return;

    // Update budget first
    this.plannerService.updatePlan(plan.id, { budget: this.budget() });
    
    const quotes = this.quoteService.quotes();
    this.plannerService.applyEqualWeight(plan.id, quotes);
  }

  /**
   * Apply allocation suggestion from AI advisor
   */
  onApplyAllocation(suggestion: AllocationSuggestion): void {
    const plan = this.currentPlan();
    if (!plan || plan.status === 'FINAL') return;

    // Update budget with current value
    this.plannerService.updatePlan(plan.id, { budget: this.budget() });

    const quotes = this.quoteService.quotes();
    
    // Add stocks to plan
    const addedSymbols = new Set<string>();
    suggestion.allocations.forEach(alloc => {
      const quote = quotes[alloc.symbol];
      if (!quote || addedSymbols.has(alloc.symbol)) return;

      this.plannerService.addItem(plan.id, alloc.symbol, alloc.symbol, quote);
      addedSymbols.add(alloc.symbol);
    });

    // Update plan with allocation amounts
    const updatedPlan = this.plannerService.getPlanForMonth(this.selectedMonth());
    if (!updatedPlan) return;

    const updatedItems = updatedPlan.items.map(item => {
      const alloc = suggestion.allocations.find(a => a.symbol === item.symbol);
      if (!alloc) return item;

      const quote = quotes[item.symbol];
      const targetQty = quote && quote.price > 0 ? Math.floor(alloc.allocation / quote.price) : 0;

      return {
        ...item,
        targetAmount: alloc.allocation,
        targetQty,
        plannedPrice: quote?.price ?? item.plannedPrice
      };
    });

    // Apply updated items
    this.plannerService.updatePlan(plan.id, { 
      items: updatedItems,
      strategy: 'AI_ADVISOR'
    });

    // Update strategy indicator
    this.selectedAllocationStrategy.set(suggestion.strategy);
  }

  onFinalizePlan(): void {
    const plan = this.currentPlan();
    if (!plan) return;

    if (confirm('Finalize this plan? It cannot be edited after finalization.')) {
      this.plannerService.finalizePlan(plan.id);
    }
  }

  onDeletePlan(): void {
    const plan = this.currentPlan();
    if (!plan) return;

    if (confirm('Delete this plan?')) {
      this.plannerService.deletePlan(plan.id);
    }
  }

  onClearBudget(): void {
    const plan = this.currentPlan();
    if (!plan || plan.status === 'FINAL') return;

    if (confirm('Clear budget and remove all items from this plan?')) {
      // Remove all items
      plan.items.forEach(item => {
        this.plannerService.removeItem(plan.id, item.stockId);
      });
      // Reset budget to 0
      this.budget.set(0);
      this.plannerService.updatePlan(plan.id, { budget: 0 });
    }
  }

  onExportToExcel(): void {
    const plan = this.currentPlan();
    if (!plan) return;

    // Create CSV content
    const headers = ['Symbol', 'Planned Price', 'Target Amount', 'Target Qty', 'Status'];
    const rows = plan.items.map(item => [
      item.symbol,
      item.plannedPrice?.toString() || '',
      item.targetAmount?.toString() || '',
      item.targetQty?.toString() || '',
      item.isExecuted ? 'Executed' : 'Pending'
    ]);

    // Add summary row
    rows.push([]);
    rows.push(['Total Budget', this.budget().toString()]);
    rows.push(['Total Planned', plan.totalPlannedAmount?.toString() || '0']);
    rows.push(['Plan Status', plan.status]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    link.href = URL.createObjectURL(blob);
    link.download = `DipHunter_Plan_${plan.month}_${date}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  /**
   * Execute plan — create BUY transactions for all pending (non-executed) items
   */
  onExecutePlan(): void {
    const plan = this.currentPlan();
    if (!plan || plan.items.length === 0) return;

    const pending = plan.items.filter(i => !i.isExecuted && i.targetQty && i.targetQty > 0);
    if (pending.length === 0) {
      alert('All items already executed.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const confirmed = confirm(
      `Create ${pending.length} buy transaction(s) from plan ${plan.month}?\n` +
      pending.map(i => `• ${i.symbol}: ${i.targetQty} qty @ ₹${i.plannedPrice}`).join('\n')
    );
    if (!confirmed) return;

    const executedStockIds: string[] = [];
    for (const item of pending) {
      const price = this.quoteService.getQuote(item.symbol)?.price ?? item.plannedPrice;
      this.transactionService.addBuy({
        symbol: item.symbol,
        stockId: item.stockId,
        qty: item.targetQty!,
        price,
        charges: 0,
        date: today,
        planId: plan.id
      });
      executedStockIds.push(item.stockId);
    }

    this.plannerService.markItemsExecuted(plan.id, executedStockIds);
    alert(`${executedStockIds.length} transaction(s) created. View them in Transactions page.`);
  }

  /**
   * Save current plan as a named draft
   */
  onSaveAsDraft(): void {
    const plan = this.currentPlan();
    if (!plan || plan.items.length === 0) return;

    if (!this.canSaveDraft()) {
      alert('Maximum 5 drafts reached. Delete a draft first.');
      return;
    }

    const name = prompt(`Name this draft (plan: ${plan.month}):`, `Plan ${plan.month}`);
    if (name === null) return; // cancelled

    const draft = this.draftsService.createFromPlan(plan, name);
    if (draft) {
      alert(`Draft "${draft.name}" saved! View it in the Drafts page.`);
    }
  }

  formatCurrency(value: number | undefined): string {
    if (value === undefined) return '—';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  formatPercent(value: number | undefined): string {
    if (value === undefined) return '—';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  trackByItem(index: number, item: PlanItem): string {
    return item.stockId;
  }
}
