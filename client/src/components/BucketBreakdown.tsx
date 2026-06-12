import { BucketSlice } from '../hooks/useSummary';
import { CATEGORY_COLOR, inr } from '../format';

interface Props {
  buckets: BucketSlice[];
}

export default function BucketBreakdown({ buckets }: Props) {
  if (buckets.length === 0) return null;
  return (
    <ul className="space-y-3">
      {buckets.map((b) => (
        <li key={b.category}>
          <div className="flex items-baseline justify-between text-sm">
            <span className="flex items-center gap-2 text-ink">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: CATEGORY_COLOR[b.category] }}
              />
              {b.category}
              <span className="text-faint">· {b.count}</span>
            </span>
            <span className="tnum text-ink">
              {inr(b.amount)}
              <span className="ml-2 text-faint">{b.pct}%</span>
            </span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface2">
            <div
              className="h-full rounded-full"
              style={{
                width: `${b.pct}%`,
                backgroundColor: CATEGORY_COLOR[b.category],
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
