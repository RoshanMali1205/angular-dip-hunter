/**
 * Plan Model - Monthly purchase plan
 */

export type PlanStatus = 'DRAFT' | 'FINAL';
export type AllocationStrategy = 'EQUAL_WEIGHT' | 'CUSTOM_WEIGHT' | 'EQUAL' | 'RISK_ADJUSTED' | 'DEFENSIVE' | 'AI_ADVISOR';

/** Strategy type used by the allocation advisor UI */
export type AdvisorStrategy = 'equal' | 'risk-adjusted' | 'defensive' | 'gemini';

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
  /** Present when suggestion came from the Gemini serverless function */
  provider?: 'gemini';
  model?: string;
  disclaimer?: string;
}

/** Slim stock payload sent to /api/ai */
export interface AiAllocateStockInput {
  symbol: string;
  displayName: string;
  sector?: string;
  price?: number;
  changePercent?: number;
  holdingQty?: number;
}

export interface AiAllocateRequest {
  action: 'allocate';
  budget: number;
  currency?: string;
  stocks: AiAllocateStockInput[];
}

export interface AiAllocateResponse {
  suggestion: AllocationSuggestion;
}

export type DipAction = 'buy' | 'watch' | 'skip';
export type DipMarketTone = 'risk-on' | 'cautious' | 'defensive';
export type DipDropType = 'technical' | 'sector-wide' | 'news-based' | 'correction' | 'unknown';
export type DipConfidence = 'high' | 'medium' | 'low';

export interface DipPick {
  symbol: string;
  displayName: string;
  score: number;
  action: DipAction;
  confidence: DipConfidence;
  dropType: DipDropType;
  rationale: string;
  riskNote: string;
}

export interface DipPrediction {
  summary: string;
  marketTone: DipMarketTone;
  picks: DipPick[];
  provider?: 'gemini' | 'local';
  model?: string;
  disclaimer?: string;
}

export interface AiPredictRequest {
  action: 'predict';
  currency?: string;
  stocks: AiAllocateStockInput[];
}

export interface AiPredictResponse {
  prediction: DipPrediction;
}

export type ChatRole = 'user' | 'assistant';

export interface ChatTableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
  tone?: 'change' | 'pl';
}

export interface ChatTable {
  columns: ChatTableColumn[];
  rows: Record<string, string>[];
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  provider?: 'gemini' | 'local';
  createdAt: string;
  table?: ChatTable;
}

export interface AiChatHistoryTurn {
  role: ChatRole;
  text: string;
}

export interface AiChatRequest {
  action: 'chat';
  message: string;
  history?: AiChatHistoryTurn[];
  context?: string;
}

export interface AiChatResponse {
  reply: string;
  provider: 'gemini';
  model?: string;
  disclaimer?: string;
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
  name?: string;   // Optional plan name for multiple plans per month
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

/** A named draft scenario — not tied to a specific month, max 5 */
export interface PlanDraftItem {
  stockId: string;
  symbol: string;
  displayName?: string;
  targetAmount: number;
  targetQty?: number;
  plannedPrice: number;
}

export interface PlanDraft {
  id: string;
  name: string;
  budget: number;
  items: PlanDraftItem[];
  totalPlannedAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
