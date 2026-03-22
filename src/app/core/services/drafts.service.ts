/**
 * Drafts Service — manage named plan drafts (max 5)
 */

import { Injectable, signal, computed } from '@angular/core';
import { PlanDraft, PlanDraftItem, MonthlyPlan } from '../models/plan.model';
import { StorageService } from './storage.service';

export const MAX_DRAFTS = 5;

@Injectable({ providedIn: 'root' })
export class DraftsService {
  private readonly _drafts = signal<PlanDraft[]>([]);

  readonly drafts = this._drafts.asReadonly();
  readonly draftCount = computed(() => this._drafts().length);
  readonly canCreate = computed(() => this._drafts().length < MAX_DRAFTS);

  constructor(private storage: StorageService) {
    this.load();
  }

  private load(): void {
    const stored = this.storage.get<PlanDraft[]>('dh_drafts');
    if (stored) this._drafts.set(stored);
  }

  private save(): void {
    this.storage.set('dh_drafts', this._drafts());
  }

  /** Create a blank draft */
  createDraft(name: string, budget = 0): PlanDraft | null {
    if (!this.canCreate()) return null;
    const now = new Date().toISOString();
    const draft: PlanDraft = {
      id: `draft_${Date.now()}`,
      name: name.trim() || `Draft ${this.draftCount() + 1}`,
      budget,
      items: [],
      totalPlannedAmount: 0,
      createdAt: now,
      updatedAt: now
    };
    this._drafts.update(d => [...d, draft]);
    this.save();
    return draft;
  }

  /** Create draft from an existing MonthlyPlan */
  createFromPlan(plan: MonthlyPlan, name: string): PlanDraft | null {
    if (!this.canCreate()) return null;
    const now = new Date().toISOString();
    const draft: PlanDraft = {
      id: `draft_${Date.now()}`,
      name: name.trim() || `Plan ${plan.month}`,
      budget: plan.budget,
      items: plan.items.map(i => ({
        stockId: i.stockId,
        symbol: i.symbol,
        targetAmount: i.targetAmount,
        targetQty: i.targetQty,
        plannedPrice: i.plannedPrice
      })),
      totalPlannedAmount: plan.totalPlannedAmount,
      createdAt: now,
      updatedAt: now
    };
    this._drafts.update(d => [...d, draft]);
    this.save();
    return draft;
  }

  /** Update draft name / budget / notes */
  updateDraft(id: string, patch: Partial<Pick<PlanDraft, 'name' | 'budget' | 'notes' | 'items' | 'totalPlannedAmount'>>): boolean {
    const idx = this._drafts().findIndex(d => d.id === id);
    if (idx === -1) return false;
    this._drafts.update(drafts => {
      const updated = [...drafts];
      updated[idx] = { ...updated[idx], ...patch, updatedAt: new Date().toISOString() };
      // Recalculate total
      updated[idx].totalPlannedAmount = updated[idx].items.reduce((s, i) => s + i.targetAmount, 0);
      return updated;
    });
    this.save();
    return true;
  }

  /** Add stock item to a draft */
  addItem(draftId: string, item: PlanDraftItem): boolean {
    const draft = this._drafts().find(d => d.id === draftId);
    if (!draft) return false;
    if (draft.items.some(i => i.stockId === item.stockId)) return false;
    return this.updateDraft(draftId, { items: [...draft.items, item] });
  }

  /** Remove stock item from a draft */
  removeItem(draftId: string, stockId: string): boolean {
    const draft = this._drafts().find(d => d.id === draftId);
    if (!draft) return false;
    return this.updateDraft(draftId, { items: draft.items.filter(i => i.stockId !== stockId) });
  }

  /** Update a single item's targetAmount */
  updateItemAmount(draftId: string, stockId: string, targetAmount: number, targetQty?: number): boolean {
    const draft = this._drafts().find(d => d.id === draftId);
    if (!draft) return false;
    const items = draft.items.map(i =>
      i.stockId === stockId ? { ...i, targetAmount, ...(targetQty !== undefined ? { targetQty } : {}) } : i
    );
    return this.updateDraft(draftId, { items });
  }

  /** Apply equal-weight allocation to a draft */
  applyEqualWeight(draftId: string): boolean {
    const draft = this._drafts().find(d => d.id === draftId);
    if (!draft || draft.items.length === 0 || draft.budget <= 0) return false;
    const perStock = draft.budget / draft.items.length;
    const items = draft.items.map(i => ({
      ...i,
      targetAmount: perStock,
      targetQty: i.plannedPrice > 0 ? Math.floor(perStock / i.plannedPrice) : 0
    }));
    return this.updateDraft(draftId, { items });
  }

  /** Delete a draft */
  deleteDraft(id: string): boolean {
    const before = this._drafts().length;
    this._drafts.update(d => d.filter(x => x.id !== id));
    if (this._drafts().length === before) return false;
    this.save();
    return true;
  }

  getDraft(id: string): PlanDraft | undefined {
    return this._drafts().find(d => d.id === id);
  }
}
