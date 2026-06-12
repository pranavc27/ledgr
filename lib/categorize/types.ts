import { NormalizedTransaction } from '../parsers/types';

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

/** Which stage of the hybrid pipeline assigned the category. */
export type CategorySource = 'pass1' | 'p2p' | 'llm' | 'fallback';

/** How sure we are of the assigned category — drives the review queue. */
export type Confidence = 'high' | 'low';

export interface CategorizedTransaction extends NormalizedTransaction {
  category: Category;
  /** Cleaned, human-readable merchant or counterparty name. */
  merchant: string;
  /** For People (P2P) rows: the other party's name. */
  counterparty?: string;
  source: CategorySource;
  confidence: Confidence;
}

/** Stats surfaced to the user for the writeup. */
export interface PipelineStats {
  total: number;
  pass1: number; // deterministic merchant table hits
  p2p: number; // person-to-person detected without LLM
  llm: number; // sent to Gemini
  fallback: number; // LLM unavailable/failed → defaulted to Other
  pass1Pct: number;
  llmPct: number;
}
