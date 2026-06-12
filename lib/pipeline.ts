import { NormalizedTransaction } from './parsers/types';
import {
  Category,
  CategorizedTransaction,
  CategorySource,
  Confidence,
  PipelineStats,
} from './categorize/types';
import { matchMerchant, normalizeNarration } from './categorize/merchantTable';
import { detectPerson } from './categorize/p2pDetector';
import {
  categorizeWithLlm,
  isLlmConfigured,
  LlmRow,
  LlmUnavailableError,
} from './categorize/llm';

export interface PipelineResult {
  transactions: CategorizedTransaction[];
  stats: PipelineStats;
  /** Surfaced so the UI can warn when categorization was degraded. */
  llmUsed: boolean;
  llmError?: string;
}

interface Decision {
  category: Category;
  merchant: string;
  counterparty?: string;
  source: CategorySource;
  confidence: Confidence;
}

/**
 * Transfers above this to a personal/unknown UPI handle, seen only once in the
 * statement, are flagged for review — they're often COD paid to a delivery
 * rider's personal UPI or a marketplace settlement, not a real P2P transfer.
 */
const LARGE_TRANSFER = 2000;

/** Run parse output through the hybrid categorization pipeline. */
export async function runPipeline(
  txns: NormalizedTransaction[],
): Promise<PipelineResult> {
  // Per-request cache keyed by normalized narration so repeated merchants /
  // people are only decided once (and only sent to the LLM once).
  const cache = new Map<string, Decision>();
  const norms: string[] = [];
  const needLlm = new Map<string, LlmRow>(); // unique norm -> representative row

  // ---- Deterministic passes (no network) ----
  txns.forEach((t, i) => {
    const norm = normalizeNarration(t.narration);
    norms[i] = norm;
    if (cache.has(norm)) return;

    const det = decideDeterministic(t, norm);
    if (det) {
      cache.set(norm, det);
    } else if (!needLlm.has(norm)) {
      needLlm.set(norm, { index: needLlm.size, narration: t.narration });
    }
  });

  // ---- LLM pass for the remainder ----
  let llmUsed = false;
  let llmError: string | undefined;
  const llmRows = [...needLlm.values()];
  if (llmRows.length > 0 && isLlmConfigured()) {
    try {
      const results = await categorizeWithLlm(llmRows);
      llmUsed = true;
      const rowByIndex = new Map(llmRows.map((r) => [r.index, r]));
      for (const res of results) {
        const norm = normalizeNarration(rowByIndex.get(res.index)!.narration);
        cache.set(norm, {
          category: res.category,
          merchant: res.cleaned_merchant,
          counterparty: res.is_person ? res.cleaned_merchant : undefined,
          source: 'llm',
          confidence: res.confidence,
        });
      }
    } catch (err) {
      llmError =
        err instanceof LlmUnavailableError
          ? err.message
          : 'Categorization service error';
    }
  } else if (llmRows.length > 0) {
    llmError = 'GEMINI_API_KEY not configured — long tail left as "Other".';
  }

  // How many times each distinct (normalized) narration occurs. Repeated
  // counterparties — refs/numbers stripped — collapse to one key, so a one-off
  // transfer has frequency 1.
  const freq = new Map<string, number>();
  for (const n of norms) freq.set(n, (freq.get(n) ?? 0) + 1);

  // ---- Assemble + fallback ----
  const transactions: CategorizedTransaction[] = txns.map((t, i) => {
    const norm = norms[i];
    const d = cache.get(norm) ?? fallbackDecision(t);
    const source = cache.has(norm) ? d.source : 'fallback';
    return {
      ...t,
      category: d.category,
      merchant: d.merchant,
      counterparty: d.counterparty,
      source,
      confidence: scoreConfidence(t, d, freq.get(norm) ?? 1),
    };
  });

  return { transactions, stats: computeStats(transactions), llmUsed, llmError };
}

// ---------------------------------------------------------------------------
// Deterministic decisioning (Pass 1 + P2P)
// ---------------------------------------------------------------------------

function decideDeterministic(
  t: NormalizedTransaction,
  norm: string,
): Decision | null {
  // Cheap unambiguous specials first (ATM, interest/salary credits).
  const special = decideSpecial(t, norm);
  if (special) return special;

  // Pass 1 — merchant table. Exact merchant match = high confidence.
  const merch = matchMerchant(norm);
  if (merch) {
    return {
      category: merch.category,
      merchant: merch.merchant,
      source: 'pass1',
      confidence: 'high',
    };
  }

  // Confident person-to-person. Base high, but scoreConfidence may downgrade a
  // large one-off transfer to a personal handle.
  const person = detectPerson(t.narration);
  if (person) {
    return {
      category: 'People',
      merchant: person.counterparty,
      counterparty: person.counterparty,
      source: 'p2p',
      confidence: 'high',
    };
  }
  return null;
}

const ATM_RE = /\b(atw|nwd|eaw|atm|cash\s?wdl|cashwithdrawal)\b/i;
const INTEREST_RE = /\b(int\.?pd|interest|cr\s?int)\b/i;
const SALARY_RE = /\b(salary|sal\s?cr|neft.*salary)\b/i;

function decideSpecial(t: NormalizedTransaction, norm: string): Decision | null {
  if (ATM_RE.test(norm)) {
    return { category: 'Cash/ATM', merchant: 'ATM Withdrawal', source: 'pass1', confidence: 'high' };
  }
  if (t.credit > 0 && INTEREST_RE.test(norm)) {
    return { category: 'Income', merchant: 'Interest Credit', source: 'pass1', confidence: 'high' };
  }
  if (t.credit > 0 && SALARY_RE.test(norm)) {
    return { category: 'Income', merchant: 'Salary', source: 'pass1', confidence: 'high' };
  }
  return null;
}

function fallbackDecision(t: NormalizedTransaction): Decision {
  return {
    category: t.credit > 0 ? 'Income' : 'Other',
    merchant: 'Unknown',
    source: 'fallback',
    confidence: 'low',
  };
}

/**
 * Final confidence, applying the large-one-off-transfer review rule on top of
 * the per-source base. A sizeable debit to a personal/unknown UPI handle that
 * appears only once in the statement can't be reliably attributed and is
 * flagged low so it surfaces in the review queue.
 */
function scoreConfidence(
  t: NormalizedTransaction,
  d: Decision,
  occurrences: number,
): Confidence {
  const hasVpa = /@/.test(t.narration) || /^upi[-/]/i.test(t.narration.trim());
  const personalOrUnknown =
    d.category === 'People' || (d.source === 'fallback' && hasVpa);
  if (
    t.debit > LARGE_TRANSFER &&
    personalOrUnknown &&
    occurrences <= 1
  ) {
    return 'low';
  }
  return d.confidence;
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

function computeStats(txns: CategorizedTransaction[]): PipelineStats {
  const total = txns.length;
  const count = (s: CategorySource) => txns.filter((t) => t.source === s).length;
  const pass1 = count('pass1');
  const p2p = count('p2p');
  const llm = count('llm');
  const fallback = count('fallback');
  const pct = (n: number) => (total ? Math.round((n / total) * 1000) / 10 : 0);
  return {
    total,
    pass1,
    p2p,
    llm,
    fallback,
    // "Deterministic" share = merchant table + specials + confident P2P.
    pass1Pct: pct(pass1 + p2p),
    llmPct: pct(llm),
  };
}
