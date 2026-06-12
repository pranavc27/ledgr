import { Category } from './types';

/** Indian-grouping currency, no decimals for big figures by default. */
export function inr(n: number, opts: { decimals?: boolean } = {}): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: opts.decimals ? 2 : 0,
    maximumFractionDigits: opts.decimals ? 2 : 0,
  }).format(n);
}

export function shortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

/** YYYY-MM key → "June 2026". */
export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7); // YYYY-MM
}

/** One emoji per bucket — a quick visual anchor that lowers reading effort. */
export const CATEGORY_EMOJI: Record<Category, string> = {
  'Food & Dining': '🍽️',
  Groceries: '🛒',
  'Travel & Transport': '🚕',
  Shopping: '🛍️',
  'Bills & Utilities': '💡',
  Entertainment: '🎬',
  Health: '💊',
  People: '👥',
  Income: '💰',
  Investments: '📈',
  'Cash/ATM': '🏧',
  Other: '🗂️',
};

/** Category label prefixed with its emoji, e.g. "🍽️ Food & Dining". */
export function categoryLabel(c: Category): string {
  return `${CATEGORY_EMOJI[c]} ${c}`;
}

/** A muted, distinguishable spectrum that reads cleanly on pure black. */
export const CATEGORY_COLOR: Record<Category, string> = {
  'Food & Dining': '#e8a14d',
  Groceries: '#74cf9e',
  'Travel & Transport': '#5b9be3',
  Shopping: '#e87fa0',
  'Bills & Utilities': '#b8bdc9',
  Entertainment: '#a98ee6',
  Health: '#52ccbf',
  People: '#edc54a',
  Income: '#5cc98e',
  Investments: '#6aa9d8',
  'Cash/ATM': '#8f95a6',
  Other: '#5d5d64',
};
