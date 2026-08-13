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
});
