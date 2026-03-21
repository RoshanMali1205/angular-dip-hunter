/**
 * Plan Model - Monthly purchase plan
 */

export type PlanStatus = 'DRAFT' | 'FINAL';
export type AllocationStrategy = 'EQUAL_WEIGHT' | 'CUSTOM_WEIGHT' | 'EQUAL' | 'RISK_ADJUSTED' | 'DEFENSIVE' | 'AI_ADVISOR';

/** Strategy type used by the allocation advisor UI */
export type AdvisorStrategy = 'equal' | 'risk-adjusted' | 'defensive';

export interface AllocationSuggestion {
  strategy: AdvisorStrategy;
  name: string;
  description: string;
  rationale: string;
  allocations: {
    symbol: string;
    displayName: string;
    allocation: number;
    percentage: number;
    reason: string;
  }[];
  riskProfile: 'aggressive' | 'balanced' | 'conservative';
  expectedReturn: string;
}

export interface PlanItem {
  stockId: string;
  symbol: string;
  targetAmount: number;
  targetQty?: number;
  plannedPrice: number;  // Snapshot price at plan creation
  actualPrice?: number;  // Price when executed
  actualQty?: number;
  isExecuted: boolean;
  executedAt?: string;
}

export interface MonthlyPlan {
  id: string;
  month: string;  // Format: YYYY-MM
  status: PlanStatus;
  budget: number;
  strategy: AllocationStrategy;
  items: PlanItem[];
  totalPlannedAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string;
}
