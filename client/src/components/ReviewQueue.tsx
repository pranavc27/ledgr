import { Category } from '../types';
import { EffectiveTxn } from '../hooks/useSummary';
import { inr, shortDate } from '../format';
import { CategoryDropdown } from './TransactionTable';

interface Props {
  rows: EffectiveTxn[];
  onOverride: (id: number, category: Category) => void;
}

/**
 * Low-confidence transactions surfaced at the top of the dashboard. Each is a
 * one-tap fix: choosing a category resolves it (and propagates to the same
 * counterparty across the session). Correcting recomputes the summary live.
 */
export default function ReviewQueue({ rows, onOverride }: Props) {
  if (rows.length === 0) return null;
  return (
    <section className="mt-6 rounded-xl border border-brassDim/50 bg-surface p-5">
      <div className="mb-1 flex items-center gap-2">
        <span className="flex h-5 items-center rounded-full bg-brass/15 px-2 text-xs font-medium text-brass">
          {rows.length} to review
        </span>
        <h3 className="font-display text-lg text-ink">Review these</h3>
      </div>
      <p className="mb-4 text-xs text-faint">
        We weren’t sure about these — often large transfers to a personal UPI
        handle (a delivery COD, a settlement) that can’t be pinned to a merchant.
        Confirm or fix a category.
      </p>

      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm text-ink">
                <span>{r.counterparty || r.merchant || '—'}</span>
                <span className="tnum text-faint">{shortDate(r.date)}</span>
              </div>
              <div
                className="max-w-md truncate text-xs text-faint"
                title={r.narration}
              >
                {r.narration}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:shrink-0 sm:gap-3">
              <span
                className={`tnum shrink-0 whitespace-nowrap text-sm ${
                  r.debit > 0 ? 'text-negative' : 'text-positive'
                }`}
              >
                {r.debit > 0 ? '−' : '+'}
                {inr(r.debit > 0 ? r.debit : r.credit, { decimals: true })}
              </span>
              <CategoryDropdown
                value={r.effectiveCategory}
                onChange={(c) => onOverride(r.id, c)}
                className="flex-1 sm:w-40 sm:flex-none"
              />
              {/* Confirm the algo's guess as-is. A native <select> doesn't fire
                  onChange when you re-pick the same option, so this is how you
                  accept e.g. "People → People". */}
              <button
                type="button"
                onClick={() => onOverride(r.id, r.effectiveCategory)}
                title="Confirm this category"
                aria-label="Confirm this category"
                className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md border border-line text-muted transition-colors hover:border-brass hover:text-brass"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
