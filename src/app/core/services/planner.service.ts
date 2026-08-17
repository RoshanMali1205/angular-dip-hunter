/**
 * Planner Service - Monthly purchase planning
 */

import { Injectable, signal, computed } from '@angular/core';
import { MonthlyPlan, PlanItem, PlanStatus, AllocationStrategy } from '../models/plan.model';
import { Quote } from '../models/quote.model';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class PlannerService {
  private readonly _plans = signal<MonthlyPlan[]>([]);

  readonly plans = this._plans.asReadonly();

  // Current month in YYYY-MM format
  readonly currentMonth = this.getCurrentMonth();

  constructor(private storage: StorageService) {
    this.loadFromStorage();
  }

  /**
   * Get current month string
   */
  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Load plans from storage
   */
  private loadFromStorage(): void {
    const stored = this.storage.get<MonthlyPlan[]>('dh_plans');
    if (stored) {
      this._plans.set(stored);
    }
  }

  /**
   * Save plans to storage
   */
  private saveToStorage(): void {
    this.storage.set('dh_plans', this._plans());
  }

  /**
   * Get all plans for a specific month
   */
  getPlansForMonth(month: string): MonthlyPlan[] {
    return this._plans().filter(p => p.month === month);
  }

  /**
   * Get plan for a specific month (returns first match, or by ID)
   */
  getPlanForMonth(month: string): MonthlyPlan | undefined {
    return this._plans().find(p => p.month === month);
  }

  /**
   * Get plan by ID
   */
  getPlanById(planId: string): MonthlyPlan | undefined {
    return this._plans().find(p => p.id === planId);
  }

  /**
   * Get current month's plan
   */
  getCurrentPlan(): MonthlyPlan | undefined {
    return this.getPlanForMonth(this.currentMonth);
  }

  /**
   * Get the first editable (DRAFT) plan for a month, if any
   */
  getDraftPlanForMonth(month: string): MonthlyPlan | undefined {
    return this.getPlansForMonth(month).find(p => p.status === 'DRAFT');
  }

  /**
   * Get or create an editable plan for a month.
   * Prefer an existing DRAFT — never return a FINAL plan for mutation flows
   * (dashboard red-list add, draft load, etc.), since addItem rejects FINAL.
   */
  getOrCreatePlan(month: string, name?: string): MonthlyPlan {
    if (name) {
      return this.createPlan(month, 0, 'EQUAL_WEIGHT', name);
    }

    const draft = this.getDraftPlanForMonth(month);
    if (draft) {
      return draft;
    }

    // No draft yet (none, or only FINAL plans) — create a new editable plan
    return this.createPlan(month, 0, 'EQUAL_WEIGHT');
  }

  /**
   * Create a new plan
   */
  createPlan(month: string, budget = 0, strategy: AllocationStrategy = 'EQUAL_WEIGHT', name?: string): MonthlyPlan {
    const now = new Date().toISOString();
    const planCount = this.getPlansForMonth(month).length;
    const newPlan: MonthlyPlan = {
      id: `plan_${Date.now()}_${planCount}`,
      month,
      name: name || (planCount > 0 ? `Plan ${planCount + 1}` : undefined),
      status: 'DRAFT',
      budget,
      strategy,
      items: [],
      totalPlannedAmount: 0,
      createdAt: now,
      updatedAt: now
    };

    const updated = [...this._plans(), newPlan];
    this._plans.set(updated);
    this.saveToStorage();

    return newPlan;
  }

  /**
   * Add item to plan
   */
  addItem(
    planId: string, 
    stockId: string, 
    symbol: string, 
    quote?: Quote
  ): PlanItem | null {
    const plans = this._plans();
    const planIndex = plans.findIndex(p => p.id === planId);
    
    if (planIndex === -1) return null;
    
    const plan = plans[planIndex];
    if (plan.status === 'FINAL') return null;
    
    // Check if item already exists
    if (plan.items.some(i => i.stockId === stockId)) {
      return plan.items.find(i => i.stockId === stockId) || null;
    }

    const newItem: PlanItem = {
      stockId,
      symbol,
      targetAmount: 0,
      plannedPrice: quote?.price ?? 0,
      isExecuted: false
    };

    const updatedPlan: MonthlyPlan = {
      ...plan,
      items: [...plan.items, newItem],
      updatedAt: new Date().toISOString()
    };

    const updated = [...plans];
    updated[planIndex] = updatedPlan;
    this._plans.set(updated);
    this.saveToStorage();

    return newItem;
  }

  /**
   * Remove item from plan
   */
  removeItem(planId: string, stockId: string): boolean {
    const plans = this._plans();
    const planIndex = plans.findIndex(p => p.id === planId);
    
    if (planIndex === -1) return false;
    
    const plan = plans[planIndex];
    if (plan.status === 'FINAL') return false;

    const updatedPlan: MonthlyPlan = {
      ...plan,
      items: plan.items.filter(i => i.stockId !== stockId),
      updatedAt: new Date().toISOString()
    };

    this.recalculateTotalAmount(updatedPlan);

    const updated = [...plans];
    updated[planIndex] = updatedPlan;
    this._plans.set(updated);
    this.saveToStorage();

    return true;
  }

  /**
   * Update plan
   */
  updatePlan(planId: string, patch: Partial<MonthlyPlan>): MonthlyPlan | null {
    const plans = this._plans();
    const planIndex = plans.findIndex(p => p.id === planId);
    
    if (planIndex === -1) return null;
    
    const plan = plans[planIndex];
    if (plan.status === 'FINAL' && !patch.status) return null;

    const updatedPlan: MonthlyPlan = {
      ...plan,
      ...patch,
      updatedAt: new Date().toISOString()
    };

    this.recalculateTotalAmount(updatedPlan);

    const updated = [...plans];
    updated[planIndex] = updatedPlan;
    this._plans.set(updated);
    this.saveToStorage();

    return updatedPlan;
  }

  /**
   * Apply equal weight allocation to pending (non-executed) items only.
   * Newly added stocks start with targetAmount 0 and no targetQty — this fills them in.
   */
  applyEqualWeight(planId: string, quotesMap: Record<string, Quote>): MonthlyPlan | null {
    const plan = this._plans().find(p => p.id === planId);
    if (!plan || plan.status === 'FINAL' || plan.items.length === 0) return null;

    const pendingItems = plan.items.filter(i => !i.isExecuted);
    if (pendingItems.length === 0) return null;

    const perStock = plan.budget / pendingItems.length;

    const updatedItems = plan.items.map(item => {
      if (item.isExecuted) return item;

      const quote = quotesMap[item.symbol];
      const price = quote?.price ?? item.plannedPrice;
      const targetQty = price > 0 ? Math.floor(perStock / price) : 0;

      return {
        ...item,
        targetAmount: perStock,
        targetQty,
        plannedPrice: price
      };
    });

    return this.updatePlan(planId, { items: updatedItems, strategy: 'EQUAL_WEIGHT' });
  }

  /**
   * Finalize plan (lock it)
   */
  finalizePlan(planId: string): MonthlyPlan | null {
    return this.updatePlan(planId, { 
      status: 'FINAL',
      finalizedAt: new Date().toISOString()
    });
  }

  /**
   * Delete plan
   */
  deletePlan(planId: string): boolean {
    const plans = this._plans();
    const filtered = plans.filter(p => p.id !== planId);
    
    if (filtered.length === plans.length) return false;
    
    this._plans.set(filtered);
    this.saveToStorage();
    
    return true;
  }

  /**
   * Mark specific items as executed (after creating buy transactions)
   */
  markItemsExecuted(planId: string, stockIds: string[]): void {
    const plans = this._plans();
    const planIndex = plans.findIndex(p => p.id === planId);
    if (planIndex === -1) return;

    const plan = plans[planIndex];
    const executedAt = new Date().toISOString();
    const stockSet = new Set(stockIds);

    const updatedPlan: MonthlyPlan = {
      ...plan,
      items: plan.items.map(i =>
        stockSet.has(i.stockId) ? { ...i, isExecuted: true, executedAt } : i
      ),
      updatedAt: executedAt
    };

    const updated = [...plans];
    updated[planIndex] = updatedPlan;
    this._plans.set(updated);
    this.saveToStorage();
  }

  /**
   * Check if stock is already in an editable (DRAFT) plan for the current month.
   * Stocks only present on FINAL plans remain addable to a new draft.
   */
  isInCurrentPlan(stockId: string): boolean {
    const draft = this.getDraftPlanForMonth(this.currentMonth);
    return draft?.items.some(i => i.stockId === stockId) ?? false;
  }

  /**
   * Recalculate total planned amount
   */
  private recalculateTotalAmount(plan: MonthlyPlan): void {
    plan.totalPlannedAmount = plan.items.reduce((sum, item) => sum + item.targetAmount, 0);
  }
}
