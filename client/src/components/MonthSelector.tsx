import { monthLabel } from '../format';

interface Props {
  months: string[];
  selected: string | null;
  onSelect: (m: string) => void;
}

export default function MonthSelector({ months, selected, onSelect }: Props) {
  if (months.length <= 1) {
    return selected ? (
      <span className="text-sm text-muted">{monthLabel(selected)}</span>
    ) : null;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {months.map((m) => {
        const active = m === selected;
        return (
          <button
            key={m}
            onClick={() => onSelect(m)}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              active
                ? 'bg-brass text-canvas'
                : 'bg-surface text-muted hover:bg-surface2 hover:text-ink'
            }`}
          >
            {monthLabel(m)}
          </button>
        );
      })}
    </div>
  );
}
