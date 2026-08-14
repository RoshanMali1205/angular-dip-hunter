/**
 * Planner Page Component
 * Create and manage monthly purchase plans
 */

import { Component, OnInit, signal, computed, inject, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlannerService, QuoteService, PortfolioService, SettingsService, LanguageService, ThemeService, DraftsService } from '../../core/services';
import { TransactionService } from '../../core/services/transaction.service';
import { DialogService } from '../../shared/components/dialog/dialog.service';
import { MonthlyPlan, PlanItem, AdvisorStrategy, AllocationSuggestion } from '../../core/models/plan.model';
import { StockViewModel } from '../../core/models';
import { AllocationSuggestionsComponent } from './components';
import { CurrencyDisplayPipe } from '../../shared/pipes/currency-display.pipe';
import { CurrencyService } from '../../core/services/currency.service';
import { MAX_DRAFTS } from '../../core/services/drafts.service';

@Component({
  selector: 'app-planner-page',
  standalone: true,
  imports: [CommonModule, FormsModule, AllocationSuggestionsComponent, CurrencyDisplayPipe],
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
  private readonly dialog = inject(DialogService);
  private readonly currencyService = inject(CurrencyService);
  readonly currencySymbol = this.currencyService.currencySymbol;

  readonly draftCount = this.draftsService.draftCount;
  readonly canSaveDraft = this.draftsService.canCreate;
  readonly MAX_DRAFTS = MAX_DRAFTS;

  // UI State
  selectedMonth = signal(this.plannerService.currentMonth);
  selectedPlanId = signal<string | null>(null);
  budget = signal(50000);
  isLoading = signal(false);
  selectedAllocationStrategy = signal<AdvisorStrategy>('equal');
  showStrategySection = signal(true);

  /** Avoid clobbering in-progress budget edits when plan items change */
  private lastSyncedPlanId: string | null = null;

  constructor() {
    // Keep the budget field aligned with the selected plan (on plan/month switch)
    effect(() => {
      const plan = this.currentPlan();
      if (!plan || plan.id === this.lastSyncedPlanId) return;
      untracked(() => {
        this.lastSyncedPlanId = plan.id;
        this.budget.set(plan.budget);
      });
    });
  }

  /** All plans for the selected month */
  plansForMonth = computed(() =>
    this.plannerService.plans().filter(p => p.month === this.selectedMonth())
  );

  currentPlan = computed(() => {
    const planId = this.selectedPlanId();
    const plans = this.plansForMonth();
    if (planId) {
      return plans.find(p => p.id === planId) || this.preferEditablePlan(plans);
    }
    // Default to an editable draft so stocks added from the dashboard red list
    // are visible immediately (FINAL plans are often created first and would
    // otherwise hide the new draft).
    return this.preferEditablePlan(plans);
  });

  private preferEditablePlan(plans: MonthlyPlan[]): MonthlyPlan | undefined {
    return plans.find(p => p.status === 'DRAFT') || plans[0] || undefined;
  }

  isPlanLocked = computed(() =>
    this.currentPlan()?.status === 'FINAL'
  );

  // How much of the budget is allocated (sum of pending targetAmount)
  budgetUsed = computed(() => {
    const plan = this.currentPlan();
    if (!plan) return 0;
    return plan.items.filter(i => !i.isExecuted).reduce((s, i) => s + (i.targetAmount || 0), 0);
  });

  budgetUsedPercent = computed(() => {
    const b = this.budget();
    return b > 0 ? Math.min(100, Math.round((this.budgetUsed() / b) * 100)) : 0;
  });

  // Reconciliation: planned vs actual spend for this plan
  reconciliation = computed(() => {
    const plan = this.currentPlan();
    if (!plan || plan.items.length === 0) return null;

    const planTxs = this.transactionService.buyTransactions().filter(tx => tx.planId === plan.id);

    const plannedTotal = plan.items.reduce((s, i) => s + (i.targetAmount || 0), 0);
    const actualTotal = planTxs.reduce((s, tx) => s + tx.totalAmount, 0);
    const executedCount = plan.items.filter(i => i.isExecuted).length;
    const pendingCount = plan.items.filter(i => !i.isExecuted).length;

    const itemDetails = plan.items.map(item => {
      const tx = planTxs.find(t => t.stockId === item.stockId);
      return {
        symbol: item.symbol,
        planned: item.targetAmount || 0,
        actual: tx ? tx.totalAmount : 0,
        actualPrice: tx?.price,
        actualQty: tx?.qty,
        variance: tx ? tx.totalAmount - (item.targetAmount || 0) : 0,
        isExecuted: item.isExecuted
      };
    });

    return {
      plannedTotal,
      actualTotal,
      variance: actualTotal - plannedTotal,
      variancePercent: plannedTotal > 0 ? ((actualTotal - plannedTotal) / plannedTotal) * 100 : 0,
      executedCount,
      pendingCount,
      hasExecuted: executedCount > 0,
      itemDetails
    };
  });

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
    this.selectedPlanId.set(null); // reset → prefer draft via currentPlan
    this.lastSyncedPlanId = null; // force budget resync
  }

  onSelectPlan(planId: string): void {
    this.selectedPlanId.set(planId);
    this.lastSyncedPlanId = null; // force budget resync for the new plan
  }

  async onCreatePlan(): Promise<void> {
    const existingPlans = this.plansForMonth();
    let name: string | undefined;
    if (existingPlans.length > 0) {
      const input = await this.dialog.prompt('Name for this new plan:', `Plan ${existingPlans.length + 1}`, 'New Plan');
      if (input === null) return;
      name = input.trim() || `Plan ${existingPlans.length + 1}`;
    }
    const plan = this.plannerService.getOrCreatePlan(this.selectedMonth(), name);
    this.lastSyncedPlanId = null;
    this.selectedPlanId.set(plan.id);
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
   * Apply allocation suggestion from AI advisor.
   * Replaces all pending (non-executed) items with the suggested allocation.
   */
  onApplyAllocation(suggestion: AllocationSuggestion): void {
    const plan = this.currentPlan();
    if (!plan || plan.status === 'FINAL') return;

    // Remove all pending (non-executed) items first so we get a clean slate
    const pendingItems = plan.items.filter(i => !i.isExecuted);
    pendingItems.forEach(item => this.plannerService.removeItem(plan.id, item.stockId));

    this.plannerService.updatePlan(plan.id, { budget: this.budget() });

    const quotes = this.quoteService.quotes();
    const allStocks = this.portfolioService.activeStocks();

    // Add each suggested stock using the correct stockId (not just the symbol)
    suggestion.allocations.forEach(alloc => {
      const stock = allStocks.find(s => s.symbol === alloc.symbol);
      if (!stock) return;
      const quote = quotes[alloc.symbol];
      this.plannerService.addItem(plan.id, stock.id, alloc.symbol, quote);
    });

    // Apply allocation amounts & quantities to the freshly added items
    const refreshedPlan = this.plannerService.getPlanById(plan.id);
    if (!refreshedPlan) return;

    const updatedItems = refreshedPlan.items.map(item => {
      if (item.isExecuted) return item;
      const alloc = suggestion.allocations.find(a => a.symbol === item.symbol);
      if (!alloc) return item;

      const price = quotes[item.symbol]?.price ?? item.plannedPrice;
      const targetQty = price > 0 ? Math.floor(alloc.allocation / price) : 0;

      return { ...item, targetAmount: alloc.allocation, targetQty, plannedPrice: price };
    });

    this.plannerService.updatePlan(plan.id, { items: updatedItems, strategy: 'AI_ADVISOR' });
    this.selectedAllocationStrategy.set(suggestion.strategy);
    this.showStrategySection.set(false); // Collapse the strategy panel after applying
  }

  async onFinalizePlan(): Promise<void> {
    const plan = this.currentPlan();
    if (!plan) return;

    const ok = await this.dialog.confirm('Finalize this plan? It cannot be edited after finalization.', 'Finalize Plan');
    if (ok) {
      this.plannerService.finalizePlan(plan.id);
    }
  }

  async onDeletePlan(): Promise<void> {
    const plan = this.currentPlan();
    if (!plan) return;

    const ok = await this.dialog.danger(`Delete plan "${plan.name || plan.month}"?`, 'Delete Plan');
    if (ok) {
      this.plannerService.deletePlan(plan.id);
      this.selectedPlanId.set(null);
    }
  }

  async onClearBudget(): Promise<void> {
    const plan = this.currentPlan();
    if (!plan || plan.status === 'FINAL') return;

    const ok = await this.dialog.danger('Clear budget and remove all items from this plan?', 'Clear Budget');
    if (ok) {
      plan.items.forEach(item => {
        this.plannerService.removeItem(plan.id, item.stockId);
      });
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
  async onExecutePlan(): Promise<void> {
    const plan = this.currentPlan();
    if (!plan || plan.items.length === 0) return;

    const pending = plan.items.filter(i => !i.isExecuted && i.targetQty && i.targetQty > 0);
    if (pending.length === 0) {
      await this.dialog.alert('All items already executed.', 'Nothing to Execute');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const confirmed = await this.dialog.open({
      type: 'confirm',
      title: 'Execute Plan',
      message: `Create ${pending.length} buy transaction(s) from plan ${plan.month}?`,
      details: pending.map(i => `${i.symbol}: ${i.targetQty} qty @ ${this.currencyService.formatDisplay(i.plannedPrice ?? 0)}`),
      confirmText: 'Execute'
    });
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
    await this.dialog.alert(`${executedStockIds.length} transaction(s) created. View them in Transactions page.`, 'Success');
  }

  /**
   * Save current plan as a named draft
   */
  async onSaveAsDraft(): Promise<void> {
    const plan = this.currentPlan();
    if (!plan || plan.items.length === 0) return;

    if (!this.canSaveDraft()) {
      await this.dialog.alert(`Maximum ${MAX_DRAFTS} drafts reached. Delete a draft first.`, 'Limit Reached');
      return;
    }

    const name = await this.dialog.prompt(`Name this draft (plan: ${plan.month}):`, `Plan ${plan.month}`, 'Save as Draft');
    if (name === null) return;

    const draft = this.draftsService.createFromPlan(plan, name);
    if (draft) {
      await this.dialog.alert(`Draft "${draft.name}" saved! View it in the Drafts page.`, 'Draft Saved');
    }
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
