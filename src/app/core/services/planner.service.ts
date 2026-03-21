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
   * Get plan for a specific month
   */
  getPlanForMonth(month: string): MonthlyPlan | undefined {
    return this._plans().find(p => p.month === month);
  }

  /**
   * Get current month's plan
   */
  getCurrentPlan(): MonthlyPlan | undefined {
    return this.getPlanForMonth(this.currentMonth);
  }

  /**
   * Get or create plan for a month
   */
  getOrCreatePlan(month: string): MonthlyPlan {
    let plan = this.getPlanForMonth(month);
    
    if (!plan) {
      plan = this.createPlan(month);
    }
    
    return plan;
  }

  /**
   * Create a new plan
   */
  createPlan(month: string, budget = 0, strategy: AllocationStrategy = 'EQUAL_WEIGHT'): MonthlyPlan {
    const now = new Date().toISOString();
    const newPlan: MonthlyPlan = {
      id: `plan_${Date.now()}`,
      month,
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
   * Apply equal weight allocation
   */
  applyEqualWeight(planId: string, quotesMap: Record<string, Quote>): MonthlyPlan | null {
    const plan = this._plans().find(p => p.id === planId);
    if (!plan || plan.status === 'FINAL' || plan.items.length === 0) return null;

    const perStock = plan.budget / plan.items.length;
    
    const updatedItems = plan.items.map(item => {
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
   * Check if stock is in current plan
   */
  isInCurrentPlan(stockId: string): boolean {
    const plan = this.getCurrentPlan();
    return plan?.items.some(i => i.stockId === stockId) ?? false;
  }

  /**
   * Recalculate total planned amount
   */
  private recalculateTotalAmount(plan: MonthlyPlan): void {
    plan.totalPlannedAmount = plan.items.reduce((sum, item) => sum + item.targetAmount, 0);
  }
}
