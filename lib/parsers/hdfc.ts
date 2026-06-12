import * as XLSX from 'xlsx';
import { extractPdfText, TextItem } from './pdfText';
import {
  BankParser,
  NormalizedTransaction,
  ParseError,
  ParserInput,
} from './types';

/**
 * HDFC Savings statement parser. Handles two physical formats:
 *   - PDF  : password-protected, positional text reconstructed into columns.
 *   - CSV / XLS / XLSX : tabular, read via SheetJS.
 *
 * Everything HDFC-specific is contained in this file. To add another bank,
 * write a sibling module exporting a `BankParser` and route to it in pipeline.
 *
 * HDFC column order (both formats):
 *   Date | Narration | Chq./Ref.No. | Value Dt | Withdrawal | Deposit | Closing Balance
 *
 * Quirks handled:
 *   - Dates are DD/MM/YY (2-digit year → 20YY).
 *   - Narrations wrap across 2-3 physical lines with no date/amounts.
 *   - The column header appears only on page 1; later pages repeat the bank
 *     letterhead + address block, which must NOT leak into narrations.
 */

const DATE_RE = /^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/;

/** Text we never want to absorb into a narration as a continuation line. */
const JUNK_RE =
  /closing balance|statement summary|opening balance|generated on|registered office|page no|hdfc bank|account branch|account no|we understand your world/i;

export const hdfcParser: BankParser = {
  name: 'HDFC Savings',
  async parse(input: ParserInput): Promise<NormalizedTransaction[]> {
    const ext = extOf(input.filename);
    let txns: NormalizedTransaction[];
    if (ext === 'pdf') {
      txns = await parsePdf(input);
    } else if (ext === 'csv' || ext === 'xls' || ext === 'xlsx') {
      txns = parseSheet(input);
    } else {
      throw new ParseError(
        `Unsupported file type ".${ext}". Upload a PDF, CSV, or XLS/XLSX.`,
        'UNSUPPORTED_FORMAT',
      );
    }
    if (txns.length === 0) {
      throw new ParseError(
        'No transactions found. Is this an HDFC savings-account statement?',
        'NO_TRANSACTIONS',
      );
    }
    return txns;
  },
};

// ---------------------------------------------------------------------------
// PDF path
// ---------------------------------------------------------------------------

/**
 * Header x-anchors (left edge of each header label) detected once from page 1.
 * The data is NOT aligned to these: narration text sits well left of the
 * "Narration" label, and the money columns are right-aligned. So anchors are
 * used as zone thresholds, not as exact column edges.
 */
interface Anchors {
  refX: number; // left edge of "Chq./Ref.No." — narration ends before here
  creditX: number; // left edge of "Deposit Amt." — splits withdrawal vs deposit
  balanceX: number; // left edge of "Closing Balance"
}

/** Matches a money value like 1,796.00 or 141.00 (always 2 decimals). */
const AMOUNT_RE = /^-?[\d,]+\.\d{2}$/;

async function parsePdf(input: ParserInput): Promise<NormalizedTransaction[]> {
  const items = await extractPdfText(input.buffer, input.password);
  return parsePdfItems(items);
}

/**
 * Parse already-extracted positioned text into transactions. Split out from
 * `parsePdf` (which just does the pdfjs extraction) so the layout logic can be
 * unit-tested with synthetic items.
 */
export function parsePdfItems(items: TextItem[]): NormalizedTransaction[] {
  const anchors = detectAnchors(items);
  if (!anchors) {
    throw new ParseError(
      'Could not locate the statement table header. This may not be a ' +
        'standard HDFC statement.',
      'PARSE_FAILED',
    );
  }

  const rows = groupIntoRows(items);
  const txns: NormalizedTransaction[] = [];
  let current: NormalizedTransaction | null = null;
  let currentPage = -1;
  let currentY = -1;

  for (const row of rows) {
    const sorted = [...row.items].sort((a, b) => a.x - b.x);

    // A transaction row begins with a date token at the far left. Continuation
    // lines (wrapped narration) have no leading date.
    const hasDate = sorted.length > 0 && DATE_RE.test(sorted[0].text.trim());
    const date = hasDate ? normalizeDateCell(sorted[0].text.trim()) : null;
    const body = hasDate ? sorted.slice(1) : sorted;

    // Narration = everything left of the Chq./Ref column. Money values = the
    // 2-decimal amounts sitting in the right-hand columns.
    const narrationParts: string[] = [];
    const amounts: TextItem[] = [];
    for (const it of body) {
      if (it.x < anchors.refX - 4) narrationParts.push(it.text);
      else if (AMOUNT_RE.test(it.text.trim())) amounts.push(it);
      // ref numbers / value-date are ignored.
    }
    const narration = clean(narrationParts.join(' '));

    if (date) {
      if (current) txns.push(current);
      current = { date, narration, ...splitAmounts(amounts, anchors) };
      currentPage = row.page;
      currentY = row.y;
      continue;
    }

    // Continuation: append wrapped narration only when tight against the
    // current transaction (same page, small vertical gap) and not page junk.
    const sameBlock = row.page === currentPage && row.y - currentY < 22;
    if (current && narration && sameBlock && !JUNK_RE.test(narration)) {
      current.narration = `${current.narration} ${narration}`.trim();
      currentY = row.y;
    }
  }
  if (current) txns.push(current);
  return txns;
}

/**
 * Classify the row's money values. The rightmost amount is always the closing
 * balance; any other amount is a withdrawal or a deposit, decided by its RIGHT
 * edge (amounts are right-aligned, so the right edge is the stable signal):
 * right edge at/after the Deposit column ⇒ credit, otherwise debit.
 */
function splitAmounts(
  amounts: TextItem[],
  anchors: Anchors,
): { debit: number; credit: number; balance: number } {
  let debit = 0;
  let credit = 0;
  let balance = 0;
  if (amounts.length > 0) {
    const byX = [...amounts].sort((a, b) => a.x - b.x);
    balance = parseAmount(byX[byX.length - 1].text);
    for (const amt of byX.slice(0, -1)) {
      const rightEdge = amt.x + amt.width;
      if (rightEdge >= anchors.creditX) credit += parseAmount(amt.text);
      else debit += parseAmount(amt.text);
    }
  }
  return { debit, credit, balance };
}

/** Detect header x-anchors from the page-1 header row. */
function detectAnchors(items: TextItem[]): Anchors | null {
  const page1 = items.filter((i) => i.page === 1);
  const find = (re: RegExp): TextItem | undefined =>
    page1.find((i) => re.test(i.text.trim()));

  const date = find(/^Date$/i);
  const narration = find(/^Narration$/i);
  const ref = find(/^Chq/i);
  const debit = find(/^Withdrawal/i);
  const credit = find(/^Deposit/i);
  const balance = find(/^Closing/i);

  if (!date || !narration || !ref || !debit || !credit || !balance) return null;
  return { refX: ref.x, creditX: credit.x, balanceX: balance.x };
}

interface Row {
  page: number;
  y: number;
  items: TextItem[];
}

/** Cluster text fragments into visual rows by (page, y-with-tolerance). */
function groupIntoRows(items: TextItem[]): Row[] {
  const sorted = [...items].sort((a, b) =>
    a.page !== b.page ? a.page - b.page : a.y - b.y || a.x - b.x,
  );
  const rows: Row[] = [];
  for (const it of sorted) {
    const last = rows[rows.length - 1];
    if (last && last.page === it.page && Math.abs(it.y - last.y) <= 3) {
      last.items.push(it);
    } else {
      rows.push({ page: it.page, y: it.y, items: [it] });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// CSV / XLS / XLSX path
// ---------------------------------------------------------------------------

function parseSheet(input: ParserInput): NormalizedTransaction[] {
  // CSV dates are DD/MM/YY, but SheetJS would silently re-read them as US
  // M/D/YY and corrupt the day/month. So parse CSV as literal text ourselves,
  // and only use SheetJS for true binary spreadsheets (where dates are real
  // serials we can read back as Date objects unambiguously).
  let grid: unknown[][];
  if (extOf(input.filename) === 'csv') {
    grid = parseCsv(input.buffer.toString('utf8'));
  } else {
    const wb = XLSX.read(input.buffer, { type: 'buffer', cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    grid = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      blankrows: false,
      defval: '',
      raw: true,
    });
  }

  // Find the header row and map HDFC column labels to indices.
  let headerIdx = -1;
  let map: Record<string, number> | null = null;
  for (let i = 0; i < grid.length; i++) {
    const m = mapHeader(grid[i]);
    if (m) {
      headerIdx = i;
      map = m;
      break;
    }
  }
  if (!map || headerIdx === -1) {
    throw new ParseError(
      'Could not find the HDFC column header (Date / Narration / Withdrawal / ' +
        'Deposit / Closing Balance) in this file.',
      'PARSE_FAILED',
    );
  }

  const txns: NormalizedTransaction[] = [];
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const row = grid[i];
    const date = normalizeDateCell(row[map.date]);
    if (!date) continue; // skip separators / summary / blank rows
    txns.push({
      date,
      narration: clean((row[map.narration] ?? '').toString()),
      debit: parseAmount(row[map.debit]),
      credit: parseAmount(row[map.credit]),
      balance: parseAmount(row[map.balance]),
      ref: map.ref != null ? clean((row[map.ref] ?? '').toString()) || undefined : undefined,
    });
  }
  return txns;
}

function mapHeader(row: unknown[]): Record<string, number> | null {
  const idx = (re: RegExp) =>
    row.findIndex((c) => re.test((c ?? '').toString().trim()));
  const date = idx(/^date$/i);
  const narration = idx(/^narration$/i);
  const debit = idx(/withdrawal/i);
  const credit = idx(/deposit/i);
  const balance = idx(/closing balance/i);
  const ref = idx(/chq|ref/i);
  if (date < 0 || narration < 0 || debit < 0 || credit < 0 || balance < 0) {
    return null;
  }
  return { date, narration, debit, credit, balance, ...(ref >= 0 ? { ref } : {}) };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function extOf(filename: string): string {
  const i = filename.lastIndexOf('.');
  return i >= 0 ? filename.slice(i + 1).toLowerCase() : '';
}

/**
 * Turn a date cell into YYYY-MM-DD, or null if it isn't a transaction date.
 * Accepts the HDFC "DD/MM/YY" text (CSV) and real Date objects (binary xls).
 */
function normalizeDateCell(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) {
    const y = v.getFullYear();
    const mm = String(v.getMonth() + 1).padStart(2, '0');
    const dd = String(v.getDate()).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  }
  const m = DATE_RE.exec((v ?? '').toString().trim());
  if (!m) return null;
  const year = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${year}-${m[2]}-${m[1]}`; // DD/MM/YY or DD/MM/YYYY → YYYY-MM-DD
}

/**
 * Minimal RFC-4180-ish CSV parser: splits rows/columns and honours
 * double-quoted fields (so a narration containing a comma stays intact).
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    if (row.some((f) => f.trim() !== '')) rows.push(row);
  }
  return rows;
}

function parseAmount(v: unknown): number {
  if (v == null) return 0;
  const s = v.toString().replace(/,/g, '').trim();
  if (!s) return 0;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}
