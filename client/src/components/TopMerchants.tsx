import { MerchantSlice } from '../hooks/useSummary';
import { inr } from '../format';

interface Props {
  merchants: MerchantSlice[];
}

export default function TopMerchants({ merchants }: Props) {
  if (merchants.length === 0) return null;
  const max = merchants[0].amount || 1;
  return (
    <ul className="space-y-2.5">
      {merchants.map((m) => (
        <li key={m.merchant} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-sm text-ink" title={m.merchant}>
            {m.merchant}
          </span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface2">
            <span
              className="block h-full rounded-full bg-ink/70"
              style={{ width: `${(m.amount / max) * 100}%` }}
            />
          </span>
          <span className="tnum w-24 shrink-0 text-right text-sm text-ink">
            {inr(m.amount)}
          </span>
        </li>
      ))}
    </ul>
  );
}
