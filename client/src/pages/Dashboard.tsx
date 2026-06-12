import { useMemo, useState } from 'react';
import { Category, ParseResponse } from '../types';
import { useSummary } from '../hooks/useSummary';
import MonthSelector from '../components/MonthSelector';
import ReviewQueue from '../components/ReviewQueue';
import KPIRow from '../components/KPIRow';
import SpendChart from '../components/SpendChart';
import BucketBreakdown from '../components/BucketBreakdown';
import PeopleSection from '../components/PeopleSection';
import TopMerchants from '../components/TopMerchants';
import TransactionTable from '../components/TransactionTable';

interface Props {
  data: ParseResponse;
  onReset: () => void;
}

export default function Dashboard({ data, onReset }: Props) {
  const [overrides, setOverrides] = useState<Record<number, Category>>({});

  // Default to the most recent month in the statement.
  const allMonths = useMemo(
    () => [...new Set(data.transactions.map((t) => t.date.slice(0, 7)))].sort(),
    [data.transactions],
  );
  const [month, setMonth] = useState<string | null>(
    allMonths[allMonths.length - 1] ?? null,
  );

  const summary = useSummary(data.transactions, overrides, month);
  const [downloading, setDownloading] = useState(false);

  // Generate the PDF report (jsPDF is lazy-loaded so it stays out of the main
  // bundle). Reflects the selected month and any category corrections.
  async function handleDownload() {
    setDownloading(true);
    try {
      const { exportSummaryPdf } = await import('../exportPdf');
      exportSummaryPdf(summary, month);
    } finally {
      setDownloading(false);
    }
  }

  // Applying a correction to a counterparty propagates to every transaction
  // with the same normalized counterparty this session (e.g. all transfers to
  // the same person). Merchant-only rows are corrected individually.
  function setOverride(id: number, category: Category) {
    const target = data.transactions[id];
    const key = target.counterparty ? normKey(target.counterparty) : null;
    setOverrides((prev) => {
      const next = { ...prev, [id]: category };
      if (key) {
        data.transactions.forEach((t, i) => {
          if (t.counterparty && normKey(t.counterparty) === key) {
            next[i] = category;
          }
        });
      }
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <Header
        onReset={onReset}
        onDownload={handleDownload}
        downloading={downloading}
        canDownload={summary.count > 0}
        stats={data.stats}
        llmError={data.llmError}
      />

      <ReviewQueue rows={summary.reviewQueue} onOverride={setOverride} />

      <div className="mb-6 mt-6 flex items-center justify-between gap-4">
        <h2 className="font-display text-xl text-ink">Summary</h2>
        <MonthSelector months={summary.months} selected={month} onSelect={setMonth} />
      </div>

      <KPIRow
        totalSpent={summary.totalSpent}
        totalReceived={summary.totalReceived}
        net={summary.net}
        count={summary.count}
      />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Spend by category" className="lg:col-span-2">
          <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
            <SpendChart buckets={summary.buckets} totalSpent={summary.totalSpent} />
            <BucketBreakdown buckets={summary.buckets} />
          </div>
        </Panel>

        <Panel title="People" subtitle="Net per counterparty">
          <PeopleSection people={summary.people} />
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4">
        <Panel title="Top merchants">
          <TopMerchants merchants={summary.topMerchants} />
        </Panel>
      </div>

      <div className="mt-4">
        <Panel title="Transactions" subtitle="Correct any category — totals update live">
          <TransactionTable
            rows={summary.rows}
            overrides={overrides}
            onOverride={setOverride}
          />
        </Panel>
      </div>

      <footer className="mt-10 border-t border-line pt-4 text-xs text-faint">
        Parsed entirely in memory · nothing about this statement was stored on a
        server.
      </footer>
    </div>
  );
}

/** Normalize a counterparty name for grouping corrections across the session. */
function normKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

function Header({
  onReset,
  onDownload,
  downloading,
  canDownload,
  stats,
  llmError,
}: {
  onReset: () => void;
  onDownload: () => void;
  downloading: boolean;
  canDownload: boolean;
  stats: ParseResponse['stats'];
  llmError: string | null;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="font-display text-2xl text-ink">Ledgr</div>
        <p className="mt-0.5 text-sm text-muted">
          {stats.total} transactions ·{' '}
          <span className="text-ink">{stats.pass1Pct}%</span> matched
          deterministically ·{' '}
          <span className="text-ink">{stats.llmPct}%</span> via AI
        </p>
        {llmError && (
          <p className="mt-1 text-xs text-negative">{llmError}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
        <button
          onClick={onDownload}
          disabled={!canDownload || downloading}
          title="Download this month's report as a PDF"
          className="flex items-center gap-2 rounded-lg bg-brass px-3 py-1.5 text-sm font-medium text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {downloading ? (
            <svg
              className="h-3.5 w-3.5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          ) : (
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
            </svg>
          )}
          Download
        </button>
        <button
          onClick={onReset}
          className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted hover:border-brassDim hover:text-ink"
        >
          New statement
        </button>
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-line bg-surface p-5 ${className}`}
    >
      <div className="mb-4">
        <h3 className="font-display text-lg text-ink">{title}</h3>
        {subtitle && <p className="text-xs text-faint">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
