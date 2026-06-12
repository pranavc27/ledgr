interface Props {
  page: number; // 0-based current page
  pageCount: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

/** Minimal Prev / range / Next pager. Hidden when everything fits on one page. */
export default function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onChange,
}: Props) {
  if (pageCount <= 1) return null;
  const start = page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, total);
  const btn =
    'rounded-md border border-line px-2.5 py-1 text-muted transition-colors enabled:hover:border-brassDim enabled:hover:text-ink disabled:opacity-40';

  return (
    <div className="mt-4 flex items-center justify-between text-xs text-faint">
      <span className="tnum">
        {start}–{end} of {total}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className={btn}
          disabled={page === 0}
          onClick={() => onChange(page - 1)}
        >
          Prev
        </button>
        <span className="tnum px-1 text-muted">
          {page + 1}/{pageCount}
        </span>
        <button
          type="button"
          className={btn}
          disabled={page >= pageCount - 1}
          onClick={() => onChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
