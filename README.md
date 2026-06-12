# Ledgr — UPI-aware Statement Summarizer

Upload **one** HDFC savings-account statement (PDF / CSV / XLS / XLSX) and get a
clean monthly spend dashboard. The point of difference: Indian UPI narrations
are messy (`UPI-RAMVEER DHAKAD-Q226732165@YBL-...`), and most trackers dump
person-to-person transfers into "Misc". This one pulls them out and shows a net
ledger per person.

> **Stateless by design.** The statement is parsed in memory and discarded.
> There is no database, no login, and nothing about your transactions is
> persisted. The only data that ever leaves the server is cleaned narration
> text sent to the categorization model — never account numbers or balances.

---

## How it works — the hybrid pipeline

Categorization runs in three stages so the LLM only ever sees the long tail:

1. **Pass 1 — deterministic (no network).** The narration is normalized
   (lowercased, UPI refs / IFSC / phone numbers stripped) and matched against a
   built-in merchant table (Swiggy, Zomato, Blinkit, IRCTC, Amazon, Uber, …)
   plus a few unambiguous specials (ATM withdrawals, interest/salary credits).
2. **P2P detection (no network).** HDFC's UPI grammar
   (`UPI-<NAME>-<VPA>@<HANDLE>-…`) is parsed. A confident person — a multi-word
   human name, or a phone-number VPA — is bucketed as **People** with the
   counterparty surfaced. Ambiguous single names are deferred to the LLM.
3. **Pass 2 — LLM (Gemini 2.0 Flash).** Everything still unmatched is batched
   (~30 rows/call) and sent to Gemini, which returns strict JSON
   (`{index, category, cleaned_merchant, is_person}`). Output is parsed
   defensively (markdown fences stripped, categories validated). Repeated
   narrations are de-duplicated per request so each distinct merchant/person is
   only sent once.

After parsing, the app reports **what % of transactions Pass 1/P2P caught vs
what went to the LLM** — shown in the dashboard header and logged server-side.

### Confidence + review queue

Every transaction carries a `high | low` confidence flag. Exact merchant
matches and deterministic specials are `high`; the LLM returns its own
confidence per row. On top of that, a **large one-off transfer** (> ₹2,000) to a
personal/unknown UPI handle that appears only once in the statement is forced to
`low` — these are often COD paid to a delivery rider's personal UPI or a
marketplace settlement and can't be reliably attributed from the statement
alone. Recurring transfers to the same counterparty stay `high`.

Low-confidence rows surface in a **"Review these"** section at the top of the
dashboard, each with an inline category dropdown. Correcting one recomputes the
summary live (client-side only). Correcting a **counterparty** propagates the
choice to every transaction with the same normalized counterparty for the rest
of the session.

Each bank format is isolated in one module (`lib/parsers/hdfc.ts`) so other
banks can be added later without touching the rest of the app.

---

## Run locally

Prerequisites: Node 18+.

```bash
# 1. Install root (API) + client deps
npm run install:all

# 2. (optional) Set your Gemini key for the LLM pass
cp .env.example .env
#   then edit .env and set GEMINI_API_KEY
```

### Easiest: local server, no Vercel account needed

```bash
npm run build        # build the client once → client/dist
npm run dev:local    # serve client + /api/parse → http://localhost:3000
```

Open http://localhost:3000, upload an HDFC statement, enter the PDF password if
prompted, and you'll see the dashboard. This runs the **exact same pipeline** as
production (`lib/processStatement.ts`), just without the Vercel runtime — ideal
for a quick local test. It reads `GEMINI_API_KEY` from `.env`; without it, the
deterministic passes still run and the long tail is left as "Other".

You can also test the API directly:

```bash
curl -X POST http://localhost:3000/api/parse \
  -F "file=@/path/to/statement.pdf" -F "password=YOUR_PDF_PASSWORD"
```

### Alternative: run through the Vercel CLI

```bash
npm i -g vercel
npm run dev            # API + client, single command → http://localhost:3000
# …or the Vite dev server with HMR (terminal 2): cd client && npm run dev
```

PDFs are usually password-protected — the app prompts for the password and
passes it straight to the parser (it is never stored).

### Required environment variables

| Variable         | Required | Purpose                                              |
| ---------------- | -------- | ---------------------------------------------------- |
| `GEMINI_API_KEY` | No\*     | Gemini 2.0 Flash key for Pass 2 categorization.      |

\* The app runs without it — deterministic passes still work and the long tail
is left as "Other" with a visible notice.

---

## Deploy to Vercel

1. Push this folder to a Git repo and **Import Project** in Vercel.
2. Vercel auto-detects the config in `vercel.json`:
   - Build command: `npm run build` (builds the Vite client to `client/dist`)
   - Output directory: `client/dist`
   - `api/*.ts` is deployed as serverless functions automatically.
3. In **Project → Settings → Environment Variables**, add `GEMINI_API_KEY`.
4. Deploy. The dashboard is served from the root; the parser runs at
   `POST /api/parse`.

The `api/parse.ts` function is given a 60s max duration (see `vercel.json`) to
allow for larger statements + batched LLM calls.

---

## Project layout

```
api/parse.ts              POST endpoint: parse → categorize → JSON (stateless)
lib/
  parsers/
    types.ts              NormalizedTransaction + BankParser contract
    pdfText.ts            pdfjs: decrypt + positional text extraction
    hdfc.ts               HDFC PDF + CSV/XLS parser (the only bank-specific code)
  categorize/
    types.ts              Category buckets + pipeline stats
    merchantTable.ts      Pass 1 deterministic merchant matching
    p2pDetector.ts        Confident person-to-person detection
    llm.ts                Gemini 2.0 Flash batching + defensive JSON parsing
  pipeline.ts             Orchestrates Pass 1 → P2P → LLM, dedup cache, stats
client/                   React + Vite + Tailwind dashboard (one page)
```

## Supported buckets

Food & Dining · Groceries · Travel & Transport · Shopping · Bills & Utilities ·
Entertainment · Health · People (P2P) · Income · Investments · Cash/ATM · Other

## Scope

Implemented for HDFC only (structured so other banks slot in). No accounts,
auth, budgets, alerts, or persistent storage — by design.
