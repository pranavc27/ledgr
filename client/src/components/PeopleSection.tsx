import { useEffect, useState } from 'react';
import { PersonSlice } from '../hooks/useSummary';
import { inr } from '../format';
import Pagination from './Pagination';

interface Props {
  people: PersonSlice[];
}

const PAGE_SIZE = 8;

/**
 * The headline feature: person-to-person transfers pulled out of "Other" and
 * shown as a net ledger per counterparty.
 */
export default function PeopleSection({ people }: Props) {
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [people]);

  if (people.length === 0) {
    return (
      <p className="text-sm text-muted">
        No person-to-person transfers detected this month.
      </p>
    );
  }

  const pageCount = Math.max(1, Math.ceil(people.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = people.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  return (
    <div>
      <ul className="divide-y divide-line">
        {pageItems.map((p) => {
          const settled = p.net >= 0;
          return (
          <li key={p.name} className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface2 text-xs font-medium text-brass">
                {initials(p.name)}
              </span>
              <div>
                <div className="text-sm text-ink">{p.name}</div>
                <div className="text-xs text-faint">
                  {p.count} transfer{p.count > 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div
                className={`tnum text-sm ${settled ? 'text-positive' : 'text-negative'}`}
              >
                {settled ? '+' : '−'}
                {inr(Math.abs(p.net))}
              </div>
              <div className="tnum text-xs text-faint">
                {inr(p.sent)} out · {inr(p.received)} in
              </div>
            </div>
          </li>
          );
        })}
      </ul>

      <Pagination
        page={safePage}
        pageCount={pageCount}
        total={people.length}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}
