import { useRef, useState } from 'react';
import { ParseResponse } from '../types';

interface Props {
  onResult: (data: ParseResponse) => void;
}

type Status = 'idle' | 'loading';

export default function Upload({ onResult }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit(selected: File, pwd: string) {
    setStatus('loading');
    setError(null);
    const body = new FormData();
    body.append('file', selected);
    if (pwd) body.append('password', pwd);

    try {
      const res = await fetch('/api/parse', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'PASSWORD_REQUIRED' || data.code === 'WRONG_PASSWORD') {
          setNeedsPassword(true);
          setError(
            data.code === 'WRONG_PASSWORD'
              ? 'Incorrect password — try again.'
              : 'This statement is password-protected. Enter the PDF password.',
          );
          setStatus('idle');
          return;
        }
        throw new Error(data.error ?? 'Something went wrong.');
      }
      onResult(data as ParseResponse);
    } catch (e: any) {
      setError(e.message ?? 'Failed to process the statement.');
      setStatus('idle');
    }
  }

  function handleFile(f: File) {
    setFile(f);
    setNeedsPassword(false);
    setPassword('');
    submit(f, '');
  }

  return (
    <div className="mx-auto max-w-xl">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-8 py-14 text-center transition-colors ${
          dragging ? 'border-brass bg-surface2' : 'border-line bg-surface'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.csv,.xls,.xlsx"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <div className="mb-3 font-display text-2xl text-ink">
          Drop your HDFC statement
        </div>
        <p className="max-w-sm text-sm text-muted">
          PDF, CSV, or XLS/XLSX — one file. Parsed in memory and never stored.
        </p>
        {file && (
          <p className="mt-4 text-sm text-brass">{file.name}</p>
        )}
      </label>

      {needsPassword && (
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (file) submit(file, password);
          }}
        >
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="PDF password"
            className="flex-1 rounded-lg border border-line bg-canvas px-3 py-2 text-ink outline-none focus:border-brass"
          />
          <button
            type="submit"
            disabled={status === 'loading' || !password}
            className="flex items-center gap-2 rounded-lg bg-brass px-4 py-2 font-medium text-canvas disabled:opacity-50"
          >
            {status === 'loading' && <Spinner className="text-canvas" />}
            Unlock
          </button>
        </form>
      )}

      {status === 'loading' && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted">
          <Spinner />
          Parsing &amp; categorizing…
        </div>
      )}
      {error && !needsPassword && (
        <p className="mt-4 text-center text-sm text-negative">{error}</p>
      )}
      {error && needsPassword && (
        <p className="mt-2 text-center text-sm text-negative">{error}</p>
      )}
    </div>
  );
}

/** A small spinning ring — a brighter arc over a faint full circle. */
function Spinner({ className = 'text-brass' }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
