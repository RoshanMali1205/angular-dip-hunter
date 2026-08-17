import { TestBed } from '@angular/core/testing';
import { PlannerService } from './planner.service';
import { StorageService } from './storage.service';
import { MonthlyPlan } from '../models/plan.model';

describe('PlannerService', () => {
  let service: PlannerService;
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
      (key: string) => store[key] ?? null
    );
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
      (key: string, value: string) => { store[key] = value; }
    );
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(
      (key: string) => { delete store[key]; }
    );

    TestBed.configureTestingModule({});
    service = TestBed.inject(PlannerService);
  });

  afterEach(() => vi.restoreAllMocks());

  function seedFinalPlan(month = service.currentMonth): MonthlyPlan {
    const plan = service.createPlan(month, 10000);
    service.addItem(plan.id, 'stock-a', 'AAA', { price: 10 } as any);
    service.finalizePlan(plan.id);
    return service.getPlanById(plan.id)!;
  }

  describe('getOrCreatePlan()', () => {
    it('creates a draft when no plans exist', () => {
      const plan = service.getOrCreatePlan(service.currentMonth);

      expect(plan.status).toBe('DRAFT');
      expect(service.getPlansForMonth(service.currentMonth)).toHaveLength(1);
    });

    it('returns an existing draft instead of a finalized plan', () => {
      const finalPlan = seedFinalPlan();
      const draft = service.createPlan(service.currentMonth, 5000, 'EQUAL_WEIGHT', 'Plan 2');

      const result = service.getOrCreatePlan(service.currentMonth);

      expect(result.id).toBe(draft.id);
      expect(result.status).toBe('DRAFT');
      expect(result.id).not.toBe(finalPlan.id);
    });

    it('creates a new draft when only finalized plans exist (red-list add case)', () => {
      const finalPlan = seedFinalPlan();

      const result = service.getOrCreatePlan(service.currentMonth);

      expect(result.status).toBe('DRAFT');
      expect(result.id).not.toBe(finalPlan.id);
      expect(service.getPlansForMonth(service.currentMonth)).toHaveLength(2);
    });
  });

  describe('addItem() with finalized plans', () => {
    it('rejects adds to a FINAL plan', () => {
      const finalPlan = seedFinalPlan();

      const added = service.addItem(finalPlan.id, 'stock-b', 'BBB', { price: 20 } as any);

      expect(added).toBeNull();
      expect(service.getPlanById(finalPlan.id)!.items).toHaveLength(1);
    });

    it('adds to a draft created after a finalized plan exists', () => {
      seedFinalPlan();
      const draft = service.getOrCreatePlan(service.currentMonth);

      const added = service.addItem(draft.id, 'stock-b', 'BBB', { price: 20 } as any);

      expect(added).not.toBeNull();
      expect(added!.symbol).toBe('BBB');
      expect(service.getPlanById(draft.id)!.items.some(i => i.stockId === 'stock-b')).toBe(true);
    });
  });

  describe('isInCurrentPlan()', () => {
    it('returns false for stocks only present on FINAL plans', () => {
      seedFinalPlan();

      expect(service.isInCurrentPlan('stock-a')).toBe(false);
    });

    it('returns true when stock is on the current draft plan', () => {
      seedFinalPlan();
      const draft = service.getOrCreatePlan(service.currentMonth);
      service.addItem(draft.id, 'stock-b', 'BBB', { price: 20 } as any);

      expect(service.isInCurrentPlan('stock-b')).toBe(true);
      expect(service.isInCurrentPlan('stock-a')).toBe(false);
    });
  });

  describe('addItem() leaves quantity unset until allocation', () => {
    it('adds stocks without targetQty (Execute needs Equal Weight first)', () => {
      const plan = service.createPlan(service.currentMonth, 10000);
      const added = service.addItem(plan.id, 'stock-a', 'AAA', { price: 100 } as any)!;

      expect(added.targetAmount).toBe(0);
      expect(added.targetQty).toBeUndefined();
      expect(added.isExecuted).toBe(false);
    });
  });

  describe('applyEqualWeight()', () => {
    it('sets targetQty for newly added stocks', () => {
      const plan = service.createPlan(service.currentMonth, 10000);
      service.addItem(plan.id, 'stock-a', 'AAA', { price: 100 } as any);
      service.addItem(plan.id, 'stock-b', 'BBB', { price: 200 } as any);

      const updated = service.applyEqualWeight(plan.id, {
        AAA: { price: 100 } as any,
        BBB: { price: 200 } as any
      })!;

      expect(updated.items[0].targetAmount).toBe(5000);
      expect(updated.items[0].targetQty).toBe(50);
      expect(updated.items[1].targetAmount).toBe(5000);
      expect(updated.items[1].targetQty).toBe(25);
    });

    it('allocates only among pending items and leaves executed items unchanged', () => {
      const plan = service.createPlan(service.currentMonth, 10000);
      service.addItem(plan.id, 'stock-a', 'AAA', { price: 100 } as any);
      service.addItem(plan.id, 'stock-b', 'BBB', { price: 100 } as any);
      service.applyEqualWeight(plan.id, {
        AAA: { price: 100 } as any,
        BBB: { price: 100 } as any
      });
      service.markItemsExecuted(plan.id, ['stock-a']);
      service.addItem(plan.id, 'stock-c', 'CCC', { price: 50 } as any);

      const updated = service.applyEqualWeight(plan.id, {
        AAA: { price: 100 } as any,
        BBB: { price: 100 } as any,
        CCC: { price: 50 } as any
      })!;

      const executed = updated.items.find(i => i.stockId === 'stock-a')!;
      const pendingB = updated.items.find(i => i.stockId === 'stock-b')!;
      const pendingC = updated.items.find(i => i.stockId === 'stock-c')!;

      expect(executed.isExecuted).toBe(true);
      expect(executed.targetQty).toBe(50); // unchanged from first allocation
      expect(pendingB.targetAmount).toBe(5000);
      expect(pendingB.targetQty).toBe(50);
      expect(pendingC.targetAmount).toBe(5000);
      expect(pendingC.targetQty).toBe(100);
    });
  });
});
