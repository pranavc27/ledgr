import { useEffect, useState, type ReactNode } from 'react';
import { CATEGORY_COLOR, inr } from '../format';
import NetworkBackground from '../components/NetworkBackground';

interface Props {
  onStart: () => void;
}

/**
 * Animated, minimal landing page. Entrance animations are CSS-only (staggered
 * via inline animation-delay) so there's no motion library and it stays light.
 * The CTA leads to the upload screen.
 */
export default function Home({ onStart }: Props) {
  return (
    <div className="relative min-h-screen overflow-hidden ledger-rule">
      {/* animated transfer-network background */}
      <NetworkBackground />
      {/* breathing accent glow behind the hero */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] hero-glow" />

      {/* nav */}
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="animate-fade-up font-display text-xl tracking-tight text-ink">
          Ledgr
        </span>
        <button
          onClick={onStart}
          className="animate-fade-up rounded-lg border border-line px-4 py-1.5 text-sm text-muted transition-colors hover:border-brassDim hover:text-ink"
          style={{ animationDelay: '80ms' }}
        >
          Open app
        </button>
      </header>

      {/* hero */}
      <main className="relative mx-auto max-w-6xl px-6">
        <section className="grid grid-cols-1 items-center gap-12 py-12 md:grid-cols-2 md:py-20">
          <div>
            <p
              className="animate-fade-up text-sm uppercase tracking-[0.2em] text-faint"
              style={{ animationDelay: '60ms' }}
            >
              AI-powered expense intelligence
            </p>
            <h1
              className="animate-fade-up mt-4 font-display text-5xl leading-[1.05] tracking-tight text-ink md:text-6xl"
              style={{ animationDelay: '140ms' }}
            >
              See where your
              <br />
              money actually went.
            </h1>
            <p
              className="animate-fade-up mt-5 max-w-md text-lg leading-relaxed text-muted"
              style={{ animationDelay: '220ms' }}
            >
              Ledgr’s AI engine reads your bank statement, decodes every UPI
              transaction, and shows you exactly where the money went —{' '}
              <span className="text-ink">person by person, category by category.</span>
            </p>
            <div
              className="animate-fade-up mt-8 flex items-center gap-4"
              style={{ animationDelay: '300ms' }}
            >
              <button
                onClick={onStart}
                className="group rounded-xl bg-brass px-6 py-3 font-medium text-canvas transition-transform hover:scale-[1.02]"
              >
                Get started
                <span className="ml-2 inline-block transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </button>
              <span className="text-sm text-faint">Free · no sign-up</span>
            </div>
          </div>

          {/* animated mini-dashboard preview */}
          <div
            className="animate-rise"
            style={{ animationDelay: '360ms' }}
          >
            <MiniPreview />
          </div>
        </section>

        {/* what you can do */}
        <section className="border-t border-line py-16">
          <h2 className="font-display text-2xl text-ink">What Ledgr does for you</h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <Feature key={f.title} {...f} delay={i * 90} />
            ))}
          </div>
        </section>

        {/* how it works */}
        <section className="border-t border-line py-16">
          <h2 className="font-display text-2xl text-ink">How it works</h2>
          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className="animate-fade-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="tnum font-display text-3xl text-faint">
                  0{i + 1}
                </div>
                <h3 className="mt-3 text-ink">{s.title}</h3>
                <p className="mt-1 text-sm text-muted">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex justify-center">
            <button
              onClick={onStart}
              className="rounded-xl bg-brass px-6 py-3 font-medium text-canvas transition-transform hover:scale-[1.02]"
            >
              Summarize my statement →
            </button>
          </div>
        </section>

        <footer className="border-t border-line py-8 text-center text-xs text-faint">
          <p>
            Parsed in memory · nothing stored · only cleaned narration text is
            sent to the categorization model.
          </p>
          <p className="mt-3">
            Built by{' '}
            <a
              href="https://www.linkedin.com/in/pranav-chandak-26a413230/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted underline-offset-4 transition-colors hover:text-brass hover:underline"
            >
              Pranav Chandak
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}

const FEATURES = [
  {
    title: 'One upload, the whole month',
    body: 'Drop an HDFC statement (PDF, CSV or XLS). Get totals, a category breakdown and every transaction — in seconds.',
  },
  {
    title: 'People, not “Misc”',
    body: 'Transfers to friends, family and landlords are surfaced by name, with net sent and received per person.',
  },
  {
    title: 'Smart categorization',
    body: 'Instant merchant matching, with AI for the messy long tail. Every row is editable and recalculates live.',
  },
  {
    title: 'Secure by design',
    body: 'No account, no database. Your statement is parsed in memory and discarded the moment you have your summary.',
  },
];

const STEPS = [
  {
    title: 'Upload your statement',
    body: 'Password-protected PDFs are supported — the password is passed straight to the parser and never stored.',
  },
  {
    title: 'We parse & categorize',
    body: 'Deterministic rules handle the obvious merchants; AI sorts the rest into clear spending buckets.',
  },
  {
    title: 'Explore your dashboard',
    body: 'Spend by category, net per person, top merchants and a full, correctable transaction table.',
  },
];

function Feature({
  title,
  body,
  delay,
}: {
  title: string;
  body: string;
  delay: number;
}) {
  return (
    <div
      className="animate-fade-up rounded-xl border border-line bg-surface p-5 transition-colors hover:border-brassDim"
      style={{ animationDelay: `${delay}ms` }}
    >
      <h3 className="text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}

// Shared preview data — one source for the bars, the donut and the total.
const SPEND: { label: keyof typeof CATEGORY_COLOR; value: number }[] = [
  { label: 'Investments', value: 33500 },
  { label: 'People', value: 30987 },
  { label: 'Bills & Utilities', value: 29000 },
  { label: 'Travel & Transport', value: 6422 },
  { label: 'Food & Dining', value: 3803 },
];
const SPEND_TOTAL = 106174;
// Fictional sample names for the public homepage preview (not real data).
const PEOPLE: { name: string; net: number; count: number }[] = [
  { name: 'Rohan Mehta', net: 13010, count: 4 },
  { name: 'Priya Nair', net: -15000, count: 1 },
  { name: 'Arjun Sharma', net: -9305, count: 3 },
  { name: 'Neha Iyer', net: 1289, count: 1 },
];

const SLIDES = 3;
const SLIDE_H = 320;
const ROTATE_MS = 3400;

/**
 * Auto-rotating vertical carousel previewing three dashboard views (bars →
 * donut → people). Pauses on hover; holds on the first slide under
 * reduced-motion. Pure CSS transform for the vertical slide.
 */
function MiniPreview() {
  // index runs 0..SLIDES; position SLIDES is a clone of slide 0 appended at the
  // end. Sliding onto it continues downward seamlessly, then we snap back to 0
  // without animation — so the loop never visibly rewinds.
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || paused) return;
    const id = setInterval(() => setIndex((i) => i + 1), ROTATE_MS);
    return () => clearInterval(id);
  }, [paused]);

  // Re-enable the transition the frame after an instant snap-back.
  useEffect(() => {
    if (animate) return;
    const raf = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(raf);
  }, [animate]);

  return (
    <div
      className="overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl shadow-black/40"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* fixed-height window; the track slides vertically within it. No
          indicators — an "invisible", auto-playing carousel reads sleeker. */}
      <div className="h-[320px] overflow-hidden">
        <div
          className="ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            transform: `translateY(-${index * SLIDE_H}px)`,
            transition: animate ? 'transform 700ms cubic-bezier(0.22,1,0.36,1)' : 'none',
          }}
          onTransitionEnd={(e) => {
            if (
              e.target === e.currentTarget &&
              e.propertyName === 'transform' &&
              index === SLIDES
            ) {
              setAnimate(false);
              setIndex(0);
            }
          }}
        >
          <BarsSlide />
          <DonutSlide />
          <PeopleSlide />
          {/* clone of the first slide for the seamless wrap */}
          <BarsSlide />
        </div>
      </div>
    </div>
  );
}

function SlideShell({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-[320px] flex-col p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-sm text-muted">{title}</div>
          {subtitle && <div className="text-xs text-faint">{subtitle}</div>}
        </div>
        {right}
      </div>
      <div className="mt-5 flex-1">{children}</div>
    </div>
  );
}

function BarsSlide() {
  const max = Math.max(...SPEND.map((s) => s.value));
  return (
    <SlideShell
      title="Spend by category"
      right={<span className="tnum font-display text-xl text-ink">{inr(SPEND_TOTAL)}</span>}
    >
      <div className="space-y-3.5">
        {SPEND.map((r) => (
          <div key={r.label}>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-ink">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLOR[r.label] }}
                />
                {r.label}
              </span>
              <span className="tnum text-muted">{inr(r.value)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface2">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(r.value / max) * 100}%`,
                  backgroundColor: CATEGORY_COLOR[r.label],
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </SlideShell>
  );
}

function DonutSlide() {
  // Build a conic-gradient from the segments (plus an "other" remainder).
  const sum = SPEND.reduce((a, s) => a + s.value, 0);
  const segments = [
    ...SPEND.map((s) => ({ color: CATEGORY_COLOR[s.label], value: s.value })),
    { color: CATEGORY_COLOR.Other, value: Math.max(SPEND_TOTAL - sum, 0) },
  ];
  let acc = 0;
  const stops = segments
    .map((s) => {
      const start = (acc / SPEND_TOTAL) * 100;
      acc += s.value;
      const end = (acc / SPEND_TOTAL) * 100;
      return `${s.color} ${start}% ${end}%`;
    })
    .join(', ');

  return (
    <SlideShell title="Spend by category" subtitle="Share of the month">
      <div className="flex h-full items-center gap-4 sm:gap-7">
        <div className="relative h-32 w-32 shrink-0 sm:h-44 sm:w-44">
          <div
            className="h-full w-full rounded-full"
            style={{ background: `conic-gradient(from -90deg, ${stops})` }}
          />
          {/* hole */}
          <div className="absolute inset-[20%] flex flex-col items-center justify-center rounded-full bg-surface">
            <span className="text-[9px] uppercase tracking-wider text-faint sm:text-[10px]">
              Spent
            </span>
            <span className="tnum font-display text-sm text-ink sm:text-xl">
              {inr(SPEND_TOTAL)}
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-3 sm:space-y-3.5">
          {SPEND.map((s) => (
            <div
              key={s.label}
              className="flex items-center justify-between gap-2 text-xs sm:text-sm"
            >
              <span className="flex min-w-0 items-center gap-2 text-ink">
                <span
                  className="h-2 w-2 shrink-0 rounded-full sm:h-2.5 sm:w-2.5"
                  style={{ backgroundColor: CATEGORY_COLOR[s.label] }}
                />
                <span className="truncate">{s.label}</span>
              </span>
              <span className="tnum shrink-0 text-muted">
                {Math.round((s.value / SPEND_TOTAL) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </SlideShell>
  );
}

function PeopleSlide() {
  return (
    <SlideShell title="People" subtitle="Net per counterparty">
      <ul className="space-y-2.5">
        {PEOPLE.map((p) => {
          const positive = p.net >= 0;
          return (
            <li key={p.name} className="flex items-center justify-between">
              <span className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface2 text-[10px] text-brass">
                  {p.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                </span>
                <span>
                  <span className="block text-sm text-ink">{p.name}</span>
                  <span className="block text-[11px] text-faint">
                    {p.count} transfer{p.count > 1 ? 's' : ''}
                  </span>
                </span>
              </span>
              <span
                className={`tnum text-sm ${positive ? 'text-positive' : 'text-negative'}`}
              >
                {positive ? '+' : '−'}
                {inr(Math.abs(p.net))}
              </span>
            </li>
          );
        })}
      </ul>
    </SlideShell>
  );
}
