/**
 * Drafts Page — manage named plan drafts (max 5)
 */

import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DraftsService, MAX_DRAFTS } from '../../core/services/drafts.service';
import { PlannerService } from '../../core/services/planner.service';
import { PortfolioService } from '../../core/services/portfolio.service';
import { QuoteService } from '../../core/services/quote.service';
import { ThemeService } from '../../core/services/theme.service';
import { LanguageService } from '../../core/services/language.service';
import { PlanDraft, PlanDraftItem } from '../../core/models/plan.model';

interface EditState {
  draftId: string;
  name: string;
  budget: number;
  notes: string;
}

@Component({
  selector: 'app-drafts-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './drafts.page.html'
})
export class DraftsPageComponent {
  readonly draftsService = inject(DraftsService);
  readonly plannerService = inject(PlannerService);
  readonly portfolioService = inject(PortfolioService);
  readonly quoteService = inject(QuoteService);
  readonly themeService = inject(ThemeService);
  readonly lang = inject(LanguageService);
  private readonly router = inject(Router);

  readonly MAX_DRAFTS = MAX_DRAFTS;

  // New draft form
  newDraftName = signal('');
  newDraftBudget = signal(50000);
  showNewForm = signal(false);

  // Editing state — one draft at a time
  editState = signal<EditState | null>(null);

  // Expanded draft (to see items)
  expandedDraftId = signal<string | null>(null);

  readonly drafts = this.draftsService.drafts;
  readonly draftCount = this.draftsService.draftCount;
  readonly canCreate = this.draftsService.canCreate;

  // All stocks for the item picker
  readonly allStocks = computed(() => this.portfolioService.activeStocks());

  onToggleNewForm(): void {
    this.showNewForm.update(v => !v);
    this.newDraftName.set('');
    this.newDraftBudget.set(50000);
  }

  onCreateDraft(): void {
    const name = this.newDraftName().trim();
    if (!name) return;
    const draft = this.draftsService.createDraft(name, this.newDraftBudget());
    if (draft) {
      this.showNewForm.set(false);
      this.expandedDraftId.set(draft.id);
    }
  }

  onStartEdit(draft: PlanDraft): void {
    this.editState.set({
      draftId: draft.id,
      name: draft.name,
      budget: draft.budget,
      notes: draft.notes || ''
    });
  }

  onCancelEdit(): void {
    this.editState.set(null);
  }

  onSaveEdit(): void {
    const state = this.editState();
    if (!state) return;
    this.draftsService.updateDraft(state.draftId, {
      name: state.name.trim() || 'Untitled Draft',
      budget: state.budget,
      notes: state.notes || undefined
    });
    this.editState.set(null);
  }

  onDeleteDraft(draft: PlanDraft): void {
    if (!confirm(`Delete draft "${draft.name}"?`)) return;
    this.draftsService.deleteDraft(draft.id);
    if (this.expandedDraftId() === draft.id) this.expandedDraftId.set(null);
  }

  onToggleExpand(draftId: string): void {
    this.expandedDraftId.update(id => id === draftId ? null : draftId);
  }

  onApplyEqualWeight(draft: PlanDraft): void {
    if (draft.budget <= 0) {
      alert('Set a budget first.');
      return;
    }
    this.draftsService.applyEqualWeight(draft.id);
  }

  onRemoveItem(draftId: string, stockId: string): void {
    this.draftsService.removeItem(draftId, stockId);
  }

  onAddStock(draftId: string, stockId: string): void {
    const stock = this.allStocks().find(s => s.id === stockId);
    if (!stock) return;
    const quote = this.quoteService.getQuote(stock.symbol);
    const item: PlanDraftItem = {
      stockId: stock.id,
      symbol: stock.symbol,
      displayName: stock.displayName,
      targetAmount: 0,
      plannedPrice: quote?.price ?? 0
    };
    this.draftsService.addItem(draftId, item);
  }

  /** Load draft into Planner page for the current month */
  onLoadToPlanner(draft: PlanDraft): void {
    const month = this.plannerService.currentMonth;
    const confirmed = confirm(
      `Load draft "${draft.name}" into Planner for ${month}?\n` +
      `This will ADD the draft's stocks to the current plan (existing items are kept).`
    );
    if (!confirmed) return;

    // Ensure plan exists
    const plan = this.plannerService.getOrCreatePlan(month);

    // Add each draft item to the plan
    for (const item of draft.items) {
      const quote = this.quoteService.getQuote(item.symbol);
      this.plannerService.addItem(plan.id, item.stockId, item.symbol, quote);
    }

    // Set budget from draft if plan budget is 0
    if (plan.budget === 0 && draft.budget > 0) {
      this.plannerService.updatePlan(plan.id, { budget: draft.budget });
    }

    this.router.navigate(['/planner']);
  }

  /** Get stocks not yet in this draft */
  getAvailableStocks(draft: PlanDraft): typeof this.allStocks extends () => infer T ? T : never {
    const inDraft = new Set(draft.items.map(i => i.stockId));
    return this.allStocks().filter(s => !inDraft.has(s.id)) as any;
  }

  formatCurrency(value: number | undefined): string {
    if (value === undefined || value === 0) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  trackByDraft(_: number, d: PlanDraft): string { return d.id; }
  trackByItem(_: number, i: PlanDraftItem): string { return i.stockId; }
}
