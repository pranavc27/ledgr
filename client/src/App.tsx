import { useState } from 'react';
import Upload from './components/Upload';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import { ParseResponse } from './types';

export default function App() {
  const [data, setData] = useState<ParseResponse | null>(null);
  const [entered, setEntered] = useState(false);

  // Dashboard once a statement is parsed.
  if (data) {
    return (
      <div className="min-h-screen ledger-rule">
        <Dashboard data={data} onReset={() => setData(null)} />
      </div>
    );
  }

  // Landing page until the user chooses to start.
  if (!entered) {
    return <Home onStart={() => setEntered(true)} />;
  }

  // Upload screen.
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 ledger-rule">
      <button
        onClick={() => setEntered(false)}
        className="absolute left-6 top-6 text-sm text-faint transition-colors hover:text-ink"
      >
        ← Back
      </button>
      <div className="mb-10 text-center">
        <h1 className="font-display text-4xl tracking-tight text-ink md:text-5xl">
          Ledgr
        </h1>
        <p className="mx-auto mt-3 max-w-md text-muted">
          Upload one HDFC statement. See where your money went — including the
          person-to-person transfers other trackers bury in “Misc”.
        </p>
      </div>
      <Upload onResult={setData} />
      <p className="mt-8 max-w-md text-center text-xs text-faint">
        Your statement is parsed in memory and discarded. Only cleaned narration
        text is sent to the categorization model — never account numbers or
        balances.
      </p>
    </div>
  );
}
