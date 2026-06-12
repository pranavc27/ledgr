import { useMemo } from 'react';
import { Category, Transaction } from '../types';
import { monthKey } from '../format';

export interface EffectiveTxn extends Transaction {
  /** Stable index into the original server array — the override key. */
  id: number;
  /** Category after applying any client-side correction. */
  effectiveCategory: Category;
}

export interface BucketSlice {
  category: Category;
  amount: number;
  pct: number;
  count: number;
}

export interface PersonSlice {
  name: string;
  sent: number;
  received: number;
  net: number;
  count: number;
}

export interface MerchantSlice {
  merchant: string;
  amount: number;
  count: number;
}

export interface Summary {
  months: string[]; // sorted YYYY-MM keys across the whole statement
  rows: EffectiveTxn[]; // rows for the selected month
  reviewQueue: EffectiveTxn[]; // low-confidence, uncorrected rows for the month
  totalSpent: number;
  totalReceived: number;
  net: number;
  count: number;
  buckets: BucketSlice[]; // spend by category, desc
  people: PersonSlice[]; // net per counterparty, by |net| desc
  topMerchants: MerchantSlice[];
}

/**
 * Derives the entire dashboard from (server transactions + client overrides +
 * selected month). Pure and memoized — correcting a category re-runs this and
 * nothing is ever sent back to the server.
 */
export function useSummary(
  transactions: Transaction[],
  overrides: Record<number, Category>,
  month: string | null,
): Summary {
  return useMemo(() => {
    const all: EffectiveTxn[] = transactions.map((t, i) => ({
      ...t,
      id: i,
      effectiveCategory: overrides[i] ?? t.category,
    }));

    const months = [...new Set(all.map((t) => monthKey(t.date)))].sort();
    const rows = month ? all.filter((t) => monthKey(t.date) === month) : all;

    let totalSpent = 0;
    let totalReceived = 0;
    const bucketMap = new Map<Category, { amount: number; count: number }>();
    const peopleMap = new Map<string, PersonSlice>();
    const merchantMap = new Map<string, MerchantSlice>();

    for (const t of rows) {
      totalSpent += t.debit;
      totalReceived += t.credit;

      // Spend buckets are driven by debits (money out).
      if (t.debit > 0) {
        const b = bucketMap.get(t.effectiveCategory) ?? { amount: 0, count: 0 };
        b.amount += t.debit;
        b.count += 1;
        bucketMap.set(t.effectiveCategory, b);
      }

      if (t.effectiveCategory === 'People') {
        const name = t.counterparty || t.merchant || 'Unknown';
        const p =
          peopleMap.get(name) ??
          ({ name, sent: 0, received: 0, net: 0, count: 0 } as PersonSlice);
        p.sent += t.debit;
        p.received += t.credit;
        p.net = p.received - p.sent;
        p.count += 1;
        peopleMap.set(name, p);
      } else if (t.debit > 0) {
        // Top merchants exclude person-to-person transfers.
        const name = t.merchant || 'Unknown';
        const m = merchantMap.get(name) ?? { merchant: name, amount: 0, count: 0 };
        m.amount += t.debit;
        m.count += 1;
        merchantMap.set(name, m);
      }
    }

    const spendBase = totalSpent || 1;
    const buckets: BucketSlice[] = [...bucketMap.entries()]
      .map(([category, v]) => ({
        category,
        amount: v.amount,
        count: v.count,
        pct: Math.round((v.amount / spendBase) * 1000) / 10,
      }))
      .sort((a, b) => b.amount - a.amount);

    const people = [...peopleMap.values()].sort(
      (a, b) => Math.abs(b.net) - Math.abs(a.net),
    );

    const topMerchants = [...merchantMap.values()]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    // Review queue: low-confidence rows the user hasn't corrected yet. Once a
    // correction is applied (override present) the row is considered resolved.
    const reviewQueue = rows.filter(
      (t) => t.confidence === 'low' && overrides[t.id] == null,
    );

    return {
      months,
      rows,
      reviewQueue,
      totalSpent,
      totalReceived,
      net: totalReceived - totalSpent,
      count: rows.length,
      buckets,
      people,
      topMerchants,
    };
  }, [transactions, overrides, month]);
}
