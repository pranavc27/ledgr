import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { BucketSlice } from '../hooks/useSummary';
import { CATEGORY_COLOR, inr } from '../format';

interface Props {
  buckets: BucketSlice[];
  totalSpent: number;
}

export default function SpendChart({ buckets, totalSpent }: Props) {
  const data = buckets.map((b) => ({
    name: b.category,
    value: b.amount,
    color: CATEGORY_COLOR[b.category],
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        No spending this month.
      </div>
    );
  }

  return (
    <div className="relative h-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={68}
            outerRadius={92}
            paddingAngle={1.5}
            stroke="none"
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {/* Total sits in the donut hole — the calm centre of the dashboard. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs uppercase tracking-wider text-faint">Spent</span>
        <span className="tnum font-display text-2xl text-ink">
          {inr(totalSpent)}
        </span>
      </div>
    </div>
  );
}
