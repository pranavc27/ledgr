import { useEffect, useState } from 'react';
import { CATEGORIES, Category, CategorySource } from '../types';
import { EffectiveTxn } from '../hooks/useSummary';
import { categoryLabel, inr, shortDate } from '../format';
import Pagination from './Pagination';

const PAGE_SIZE = 8;

interface Props {
  rows: EffectiveTxn[];
  overrides: Record<number, Category>;
  onOverride: (id: number, category: Category) => void;
}

const SOURCE_LABEL: Record<CategorySource, string> = {
  pass1: 'Matched by merchant rules',
  p2p: 'Detected as a person',
  llm: 'Categorized by AI',
  fallback: 'Uncategorized',
};

const SOURCE_COLOR: Record<CategorySource, string> = {
  pass1: '#5cc98e',
  p2p: '#edc54a',
  llm: '#5b9be3',
  fallback: '#5d5d64',
};

export default function TransactionTable({ rows, overrides, onOverride }: Props) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);

  const filtered = query
    ? rows.filter((r) =>
        (r.merchant + ' ' + r.narration).toLowerCase().includes(query.toLowerCase()),
      )
    : rows;

  // Reset to the first page when the result set changes (search or month).
  useEffect(() => setPage(0), [query, rows]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search transactions…"
          className="w-full max-w-xs rounded-lg border border-line bg-canvas px-3 py-1.5 text-sm text-ink outline-none focus:border-brass"
        />
        <span className="shrink-0 text-xs text-faint">{filtered.length} rows</span>
      </div>

      {/* Wide screens: table. */}
      <div className="hidden sm:block">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-faint">
              <th className="w-20 py-2 pr-3 font-normal">Date</th>
              <th className="py-2 pr-3 font-normal">Description</th>
              <th className="w-48 py-2 pr-3 font-normal">Category</th>
              <th className="w-28 py-2 pl-3 text-right font-normal">Amount</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => {
              const edited = overrides[r.id] != null;
              const flagged = r.confidence === 'low' && !edited;
              return (
                <tr
                  key={r.id}
                  className={`border-b border-line/60 align-top hover:bg-surface2/40 ${
                    flagged ? 'bg-brass/[0.04]' : ''
                  }`}
                >
                  <td className="tnum whitespace-nowrap py-2.5 pr-3 text-muted">
                    {shortDate(r.date)}
                  </td>
                  <td className="min-w-0 py-2.5 pr-3">
                    <div className="truncate text-ink">{r.merchant || '—'}</div>
                    <div className="truncate text-xs text-faint" title={r.narration}>
                      {r.narration}
                    </div>
                  </td>
                  <td className="py-2.5 pr-3">
                    <CategorySelect
                      r={r}
                      edited={edited}
                      flagged={flagged}
                      onOverride={onOverride}
                    />
                  </td>
                  <td className="py-2.5 pl-3 text-right">
                    <Amount r={r} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Narrow screens: stacked cards — no horizontal scrolling. */}
      <div className="space-y-2.5 sm:hidden">
        {pageRows.map((r) => {
          const edited = overrides[r.id] != null;
          const flagged = r.confidence === 'low' && !edited;
          return (
            <div
              key={r.id}
              className={`rounded-lg border border-line p-3 ${
                flagged ? 'bg-brass/[0.04]' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm text-ink">{r.merchant || '—'}</div>
                  <div className="truncate text-xs text-faint" title={r.narration}>
                    <span className="tnum">{shortDate(r.date)}</span> · {r.narration}
                  </div>
                </div>
                <Amount r={r} />
              </div>
              <div className="mt-2.5">
                <CategorySelect
                  r={r}
                  edited={edited}
                  flagged={flagged}
                  onOverride={onOverride}
                />
              </div>
            </div>
          );
        })}
      </div>

      <Pagination
        page={safePage}
        pageCount={pageCount}
        total={filtered.length}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />
    </div>
  );
}

function Amount({ r }: { r: EffectiveTxn }) {
  return (
    <span className="shrink-0 whitespace-nowrap text-right">
      {r.debit > 0 && (
        <span className="tnum text-negative">−{inr(r.debit, { decimals: true })}</span>
      )}
      {r.credit > 0 && (
        <span className="tnum text-positive">+{inr(r.credit, { decimals: true })}</span>
      )}
    </span>
  );
}

function CategorySelect({
  r,
  edited,
  flagged,
  onOverride,
}: {
  r: EffectiveTxn;
  edited: boolean;
  flagged: boolean;
  onOverride: (id: number, category: Category) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        title={
          edited
            ? r.effectiveCategory === r.category
              ? `Reviewed — kept as ${r.category}`
              : 'Corrected by you'
            : flagged
              ? `${SOURCE_LABEL[r.source]} · low confidence, review`
              : SOURCE_LABEL[r.source]
        }
        style={{ backgroundColor: edited ? '#fafafa' : SOURCE_COLOR[r.source] }}
      />
      <CategoryDropdown
        value={r.effectiveCategory}
        onChange={(c) => onOverride(r.id, c)}
      />
    </div>
  );
}

/**
 * Category <select> with a custom chevron. The native dropdown arrow renders
 * inconsistently across browsers (dark/invisible or missing on iOS), so we
 * strip it (appearance-none) and draw our own.
 */
export function CategoryDropdown({
  value,
  onChange,
  className = 'flex-1',
}: {
  value: Category;
  onChange: (c: Category) => void;
  className?: string;
}) {
  return (
    <div className={`relative min-w-0 ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Category)}
        className="w-full appearance-none rounded-md border border-line bg-surface py-1 pl-2 pr-7 text-xs text-ink outline-none hover:border-brassDim focus:border-brass"
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {categoryLabel(c)}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted"
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}
