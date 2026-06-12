// Mirrors the server's categorized output (lib/categorize/types.ts).

export const CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Travel & Transport',
  'Shopping',
  'Bills & Utilities',
  'Entertainment',
  'Health',
  'People',
  'Income',
  'Investments',
  'Cash/ATM',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export type CategorySource = 'pass1' | 'p2p' | 'llm' | 'fallback';

export type Confidence = 'high' | 'low';

export interface Transaction {
  date: string; // YYYY-MM-DD
  narration: string;
  debit: number;
  credit: number;
  balance: number;
  ref?: string;
  category: Category;
  merchant: string;
  counterparty?: string;
  source: CategorySource;
  confidence: Confidence;
}

export interface PipelineStats {
  total: number;
  pass1: number;
  p2p: number;
  llm: number;
  fallback: number;
  pass1Pct: number;
  llmPct: number;
}

export interface ParseResponse {
  transactions: Transaction[];
  stats: PipelineStats;
  llmUsed: boolean;
  llmError: string | null;
}
