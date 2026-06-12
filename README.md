# Ledgr — see where your money actually went

**An AI-powered expense summarizer built for the mess of Indian UPI bank statements.**
Upload one HDFC statement (PDF / CSV / XLS) and get a clean monthly dashboard — with
the person-to-person UPI transfers that most trackers bury in "Misc" pulled out and
named.

### 🔗 [**Live demo → ledgr-expense-tracker.vercel.app**](https://ledgr-expense-tracker.vercel.app)

<!-- To add a hero image: take a screenshot of the live dashboard, save it as
     docs/dashboard.png, then uncomment the line below.
![Ledgr dashboard](docs/dashboard.png)
-->

> **Stateless by design.** The statement is parsed in memory and discarded — no
> database, no login, nothing about your transactions is persisted. The only data
> that leaves the server is cleaned narration text sent to the categorization model;
> never account numbers or balances.

---

## The problem

Indian bank statements are dominated by UPI, and UPI narrations are noise:

```
UPI-ARUN ANTONY-PKT-9746251006@OKBIZAXIS-UTIB0000553-123808823039-UPI
UPI-RAMVEER DHAKAD-Q226732165@YBL-YESB0YBLUPI-123817972571-UPI
```

Generic expense trackers can't make sense of this, so a huge share of real
spending — money sent to friends, family, landlords, local vendors — gets dumped
into a useless "Misc" bucket. **The most interesting part of your spending becomes
invisible.** Ledgr's whole reason for existing is to handle that long tail well.

## What it does

- **One upload → a full month.** Drop an HDFC statement (PDF, CSV, or XLS). Get
  totals, a category breakdown (donut + bars), top merchants, and every transaction.
- **People, not "Misc".** Person-to-person UPI transfers are detected and shown by
  name, with **net sent/received per counterparty** — the headline feature.
- **Hybrid categorization.** Instant deterministic matching for the fat head,
  Gemini for the messy long tail. Every row is editable and recomputes the summary
  live.
- **Confidence + review queue.** Low-confidence rows surface in a "Review these"
  section up top; confirm or correct them in one tap.
- **PDF report export.** Download a clean one-page summary report (generated
  client-side).
- **Secure by design.** No account, no database, parsed in memory and discarded.
- Animated landing page, fully responsive (mobile-friendly), dark minimal UI.

---

## How it works — the hybrid pipeline

Categorization runs in three stages so the LLM only ever sees what it needs to,
keeping it cheap and fast:

1. **Pass 1 — deterministic (no network).** The narration is normalized
   (lowercased; UPI refs / IFSC codes / phone numbers stripped) and matched against
   a built-in merchant table (Swiggy, Zomato, Blinkit, IRCTC, Amazon, Uber, …) plus
   a few unambiguous specials (ATM withdrawals, interest / salary credits).
2. **P2P detection (no network).** HDFC's UPI grammar
   (`UPI-<NAME>-<VPA>@<HANDLE>-…`) is parsed. Only an unambiguous signal — a
   **phone-number UPI handle** — is bucketed as **People** deterministically. Named
   or random handles (which a person *and* a business can share) are deferred to the
   LLM, so companies like "Google India Digital" don't pollute the People bucket.
3. **Pass 2 — LLM (Gemini, `gemini-2.5-flash-lite`).** Everything still unmatched
   is batched (~30 rows/call) and sent to Gemini, which returns strict JSON
   (`{index, category, cleaned_merchant, is_person, confidence}`). Output is parsed
   defensively (markdown fences stripped, categories validated). Repeated narrations
   are de-duplicated per request so each distinct merchant/person is sent only once.

The dashboard header reports **what % of transactions the deterministic passes
caught vs. what went to the LLM**.

### Confidence + review queue

Every transaction carries a `high | low` confidence flag. Exact matches and
deterministic specials are `high`; the LLM returns its own confidence. On top of
that, a **large one-off transfer** (> ₹2,000) to a personal/unknown UPI handle seen
only once in the statement is forced to `low` — these are often a COD payment to a
delivery rider's personal UPI or a marketplace settlement, and can't be reliably
attributed. Recurring transfers to the same counterparty stay `high`. Low-confidence
rows surface in the **"Review these"** section; correcting a counterparty propagates
the choice to every transaction with the same counterparty for the session.

---

## Tech stack

- **Frontend:** React + Vite + TypeScript + Tailwind. Recharts for the donut.
  Single dashboard page; PDF export via jsPDF (lazy-loaded).
- **Backend:** Vercel serverless function (`api/parse.ts`), Node. PDF decryption +
  positional text extraction via `pdfjs-dist`; spreadsheets via SheetJS.
- **AI:** Google Gemini (`gemini-2.5-flash-lite`), key read from `GEMINI_API_KEY`.
- **Deploy:** Vercel.

## Project layout

```
api/parse.ts              POST endpoint: parse → categorize → JSON (stateless)
lib/
  processStatement.ts     Shared core used by the API and the local dev server
  parsers/
    pdfText.ts            pdfjs: decrypt + positional (x/y) text extraction
    hdfc.ts               HDFC PDF + CSV/XLS parser (the only bank-specific code)
  categorize/
    merchantTable.ts      Pass 1 deterministic merchant matching
    p2pDetector.ts        Confident person-to-person detection
    llm.ts                Gemini batching + defensive JSON parsing
  pipeline.ts             Orchestrates Pass 1 → P2P → LLM, dedup cache, stats
client/                   React + Vite + Tailwind dashboard
```

Each bank format is isolated in one module (`lib/parsers/hdfc.ts`) so other banks
can be added without touching the rest of the app.

---

## Run locally

Prerequisites: Node 18+.

```bash
npm run install:all                 # install root (API) + client deps
cp .env.example .env                # then set GEMINI_API_KEY (optional)

npm run build                       # build the client once
npm run dev:local                   # serve client + API → http://localhost:3000
```

`dev:local` runs the **exact same pipeline as production** without needing the Vercel
CLI. Open the URL, upload a statement, enter the PDF password if prompted. Without a
Gemini key the deterministic passes still run and the long tail is left as "Other".

You can also hit the API directly:

```bash
curl -X POST http://localhost:3000/api/parse \
  -F "file=@/path/to/statement.pdf" -F "password=YOUR_PDF_PASSWORD"
```

| Env var          | Required | Purpose                                                    |
| ---------------- | -------- | ---------------------------------------------------------- |
| `GEMINI_API_KEY` | No\*     | Gemini key for the LLM pass.                               |
| `GEMINI_MODEL`   | No       | Override the model (default `gemini-2.5-flash-lite`).      |

\* Without it, deterministic passes work and the long tail stays "Other".

## Deploy (Vercel)

`vercel --prod` (the included `vercel.json` builds the client to `client/dist` and
deploys `api/parse.ts` as a serverless function). Add `GEMINI_API_KEY` as a project
environment variable.

---

## Engineering notes — things I hit and how I solved them

A few problems that made this more than a CRUD app:

- **The PDF table doesn't line up with its headers.** In the real HDFC PDF, narration
  text sits well *left* of the "Narration" column header, and the money columns are
  *right-aligned*. A naïve "assign each word to the nearest header" approach put
  narration into the Date column and misread deposits as withdrawals. The parser
  instead detects the leftmost date token per row and classifies amounts by their
  **right edge** (rightmost = closing balance; the rest split on the Deposit column
  boundary). See `lib/parsers/hdfc.ts`.

- **`ERR_REQUIRE_ESM` on Vercel — worked locally, crashed in production.** `pdfjs`
  v4 is ESM-only, but Vercel compiles the function to CommonJS and TypeScript
  silently downlevels `await import()` into `require()` — which can't load an ES
  module. It passed every local test because `tsx` runs ESM natively. Fix: force a
  genuine runtime `import()` via `new Function('s','return import(s)')` (so the
  compiler can't rewrite it) and force-bundle pdfjs with `includeFiles` in
  `vercel.json`. Diagnosed by reading the live function logs.

- **Keeping businesses out of "People".** A name-based heuristic flagged
  "Google India Digital" as a person. The fix was to trust *only* phone-number UPI
  handles deterministically and let the LLM judge the semantically ambiguous cases.

## Scope

Implemented for **HDFC** (structured so other banks slot in). No accounts, auth,
budgets, alerts, or persistent storage — by design. Stateless and privacy-first.

---

Built by [Pranav Chandak](https://www.linkedin.com/in/pranav-chandak-26a413230/).
