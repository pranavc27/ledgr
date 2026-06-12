import { GoogleGenerativeAI } from '@google/generative-ai';
import { CATEGORIES, Category, Confidence } from './types';

/**
 * Pass 2 — LLM categorization for everything the deterministic stages missed.
 *
 * Rows are batched (~30/call) to Gemini 2.0 Flash. The model is told to return
 * STRICT JSON only; we still parse defensively (strip markdown fences, slice to
 * the outermost array, validate every category) because models occasionally
 * wrap output in prose or fences regardless of instruction.
 *
 * Privacy note: this is the ONLY place any transaction text leaves the server,
 * and only the narration string is sent — never account numbers or balances.
 */

// Model is overridable via env so you can switch if a model has no free-tier
// quota on your key (e.g. GEMINI_MODEL=gemini-2.5-flash). flash-lite is the
// default: fast, cheap, and reliably available on the free tier.
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
const BATCH_SIZE = 30;

export interface LlmRow {
  index: number;
  narration: string;
}

export interface LlmResult {
  index: number;
  category: Category;
  cleaned_merchant: string;
  /** True when the model judged this a person-to-person transfer. */
  is_person: boolean;
  /** The model's own confidence in the categorization. */
  confidence: Confidence;
}

/** Thrown when the LLM is unavailable; pipeline catches and falls back. */
export class LlmUnavailableError extends Error {}

export function isLlmConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export async function categorizeWithLlm(rows: LlmRow[]): Promise<LlmResult[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new LlmUnavailableError('GEMINI_API_KEY not set');
  if (rows.length === 0) return [];

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: { temperature: 0, responseMimeType: 'application/json' },
  });

  const results: LlmResult[] = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const parsed = await categorizeBatch(model, batch);
    results.push(...parsed);
  }
  return results;
}

async function categorizeBatch(
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  batch: LlmRow[],
): Promise<LlmResult[]> {
  const prompt = buildPrompt(batch);
  let text: string;
  try {
    const resp = await model.generateContent(prompt);
    text = resp.response.text();
  } catch (err: any) {
    throw new LlmUnavailableError(err?.message ?? 'Gemini request failed');
  }

  const raw = parseJsonArray(text);
  const byIndex = new Map<number, LlmResult>();
  for (const item of raw) {
    const index = Number(item?.index);
    if (!Number.isInteger(index)) continue;
    byIndex.set(index, {
      index,
      category: coerceCategory(item?.category),
      cleaned_merchant: String(item?.cleaned_merchant ?? '').trim() || 'Unknown',
      is_person: Boolean(item?.is_person) || item?.category === 'People',
      confidence: coerceConfidence(item?.confidence),
    });
  }

  // Guarantee one result per requested row, even if the model dropped some.
  return batch.map(
    (r) =>
      byIndex.get(r.index) ?? {
        index: r.index,
        category: 'Other' as Category,
        cleaned_merchant: 'Unknown',
        is_person: false,
        confidence: 'low' as Confidence,
      },
  );
}

function buildPrompt(batch: LlmRow[]): string {
  const list = batch
    .map((r) => `${r.index}: ${r.narration}`)
    .join('\n');
  return `You are categorizing Indian bank-statement transactions (mostly UPI).

Categories (use EXACTLY one of these strings):
${CATEGORIES.join(', ')}

Rules:
- "People" = a person-to-person transfer (money sent to/received from an
  individual, e.g. a friend, family, landlord). The narration looks like a
  person's name or a personal UPI handle (name@oksbi, name@ybl, phone@paytm),
  NOT a business. This is important — do not dump person transfers into "Other".
- For a person, set "is_person": true and "cleaned_merchant" to the person's
  proper-cased name.
- For a business/merchant, set "is_person": false and "cleaned_merchant" to a
  short clean brand name (e.g. "Reliance Trends", "Apollo Pharmacy").
- "Income" = salary, interest, refunds, cashbacks credited in.
- "Cash/ATM" = ATM withdrawals (ATW, NWD, cash).
- If genuinely unclear, use "Other".
- "confidence": "high" only when the merchant/category is unambiguous from the
  narration. Use "low" when you are guessing, when the merchant cannot be
  reliably identified, or when a sizeable transfer to a personal UPI handle
  could be a COD payment to a delivery rider / marketplace settlement rather
  than a genuine person-to-person transfer.

Return STRICT JSON ONLY — a single array, no prose, no markdown fences:
[{"index": <number>, "category": "<one category>", "cleaned_merchant": "<string>", "is_person": <boolean>, "confidence": "high"|"low"}]

Transactions:
${list}`;
}

/** Strip fences / prose and parse the outermost JSON array. */
function parseJsonArray(text: string): any[] {
  let t = text.trim();
  // Remove ```json ... ``` or ``` ... ``` fences if present.
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = t.indexOf('[');
  const end = t.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) return [];
  try {
    const parsed = JSON.parse(t.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const CATEGORY_SET = new Set<string>(CATEGORIES);

function coerceCategory(v: unknown): Category {
  const s = String(v ?? '').trim();
  return CATEGORY_SET.has(s) ? (s as Category) : 'Other';
}

function coerceConfidence(v: unknown): Confidence {
  return String(v ?? '').trim().toLowerCase() === 'high' ? 'high' : 'low';
}
