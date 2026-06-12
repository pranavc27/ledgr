import { inr } from '../format';

interface Props {
  totalSpent: number;
  totalReceived: number;
  net: number;
  count: number;
}

export default function KPIRow({ totalSpent, totalReceived, net, count }: Props) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-4">
      <Cell label="Total spent" value={inr(totalSpent)} tone="negative" />
      <Cell label="Total received" value={inr(totalReceived)} tone="positive" />
      <Cell
        label="Net"
        value={`${net >= 0 ? '+' : '−'}${inr(Math.abs(net))}`}
        tone={net >= 0 ? 'positive' : 'negative'}
      />
      <Cell label="Transactions" value={count.toLocaleString('en-IN')} tone="ink" />
    </div>
  );
}

function Cell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'positive' | 'negative' | 'ink';
}) {
  const color =
    tone === 'positive'
      ? 'text-positive'
      : tone === 'negative'
        ? 'text-negative'
        : 'text-ink';
  return (
    <div className="bg-surface px-5 py-4">
      <div className="text-xs uppercase tracking-wider text-faint">{label}</div>
      <div className={`tnum mt-1 font-display text-2xl md:text-3xl ${color}`}>
        {value}
      </div>
    </div>
  );
}
