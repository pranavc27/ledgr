import { jsPDF } from 'jspdf';
import autoTableDefault from 'jspdf-autotable';
import { Summary } from './hooks/useSummary';
import { CATEGORY_COLOR, monthLabel } from './format';

// Normalize across bundler/runtime interop (default may be wrapped as {default}).
const autoTable: typeof autoTableDefault =
  (autoTableDefault as unknown as { default?: typeof autoTableDefault })
    .default ?? autoTableDefault;

// jsPDF's built-in fonts (Helvetica etc.) don't include the ₹ glyph, so the
// report uses "Rs" for currency. Amounts are whole rupees with Indian grouping.
const amt = (n: number) => `Rs ${Math.abs(Math.round(n)).toLocaleString('en-IN')}`;
const signed = (n: number) => `${n >= 0 ? '+' : '-'}${amt(n)}`;

const GREEN: [number, number, number] = [46, 140, 86];
const RED: [number, number, number] = [196, 72, 60];
const INK: [number, number, number] = [22, 22, 24];
const MUTED: [number, number, number] = [110, 110, 116];
const FAINT: [number, number, number] = [150, 150, 156];

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function pdfDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
}

function trunc(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '...' : s;
}

/** Build and download a one-page-style summary report for the current view. */
export function exportSummaryPdf(summary: Summary, month: string | null) {
  const { doc, filename } = buildSummaryPdf(summary, month);
  doc.save(filename);
}

/** Build the report document (no download) — separated so it's testable. */
export function buildSummaryPdf(
  summary: Summary,
  month: string | null,
): { doc: jsPDF; filename: string } {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const M = 14;
  const CW = W - 2 * M;
  const label = month ? monthLabel(month) : 'All transactions';
  let y = M + 2;

  // --- Header ---
  doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(...INK);
  doc.text('Ledgr', M, y);
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...MUTED);
  doc.text(`Statement summary  ·  ${label}`, M, y + 6);
  const gen = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  doc.text(`Generated ${gen}`, W - M, y + 6, { align: 'right' });
  y += 12;
  doc.setDrawColor(225, 225, 228).line(M, y, W - M, y);
  y += 8;

  // --- KPIs ---
  const kpis: [string, string][] = [
    ['Total spent', amt(summary.totalSpent)],
    ['Total received', amt(summary.totalReceived)],
    ['Net', signed(summary.net)],
    ['Transactions', String(summary.count)],
  ];
  const colW = CW / 4;
  kpis.forEach(([k, v], i) => {
    const x = M + i * colW;
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...FAINT);
    doc.text(k.toUpperCase(), x, y);
    doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(...INK);
    doc.text(v, x, y + 6);
  });
  y += 16;

  // --- Spend by category ---
  y = title(doc, 'Spend by category', M, y);
  summary.buckets.forEach((b) => {
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(40, 40, 44);
    doc.text(b.category, M, y);
    doc.setTextColor(...MUTED);
    doc.text(`${amt(b.amount)}   ${b.pct}%`, W - M, y, { align: 'right' });
    const barY = y + 1.4;
    doc.setFillColor(234, 234, 237).rect(M, barY, CW, 1.5, 'F');
    doc.setFillColor(...hexRgb(CATEGORY_COLOR[b.category]));
    doc.rect(M, barY, CW * Math.min(b.pct / 100, 1), 1.5, 'F');
    y += 7;
  });
  if (summary.buckets.length === 0) {
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...MUTED);
    doc.text('No spending this month.', M, y);
    y += 7;
  }
  y += 3;

  // --- People & Top merchants, side by side ---
  const gap = 8;
  const halfW = (CW - gap) / 2;
  const rightX = M + halfW + gap;
  const startY = y;

  let yL = title(doc, 'People', M, startY);
  const people = summary.people.slice(0, 8);
  if (people.length === 0) {
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...MUTED);
    doc.text('No person-to-person transfers.', M, yL);
    yL += 6;
  }
  people.forEach((p) => {
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(40, 40, 44);
    doc.text(trunc(p.name, 22), M, yL);
    doc.setTextColor(...(p.net >= 0 ? GREEN : RED));
    doc.text(signed(p.net), M + halfW, yL, { align: 'right' });
    yL += 6;
  });
  if (summary.people.length > 8) {
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...FAINT);
    doc.text(`+${summary.people.length - 8} more counterparties`, M, yL);
    yL += 5;
  }

  let yR = title(doc, 'Top merchants', rightX, startY);
  summary.topMerchants.forEach((m) => {
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(40, 40, 44);
    doc.text(trunc(m.merchant, 20), rightX, yR);
    doc.setTextColor(...MUTED);
    doc.text(amt(m.amount), rightX + halfW, yR, { align: 'right' });
    yR += 6;
  });

  y = Math.max(yL, yR) + 4;

  // --- Transactions table (auto-paginates) ---
  title(doc, 'Transactions', M, y);
  y += 2;
  autoTable(doc, {
    startY: y,
    head: [['Date', 'Description', 'Category', 'Amount']],
    body: summary.rows.map((r) => [
      pdfDate(r.date),
      trunc(r.merchant || r.counterparty || r.narration, 46),
      r.effectiveCategory,
      r.debit > 0 ? `-${amt(r.debit)}` : `+${amt(r.credit)}`,
    ]),
    margin: { left: M, right: M },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 1.8,
      textColor: [40, 40, 44],
      lineColor: [232, 232, 235],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [245, 245, 247],
      textColor: MUTED,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 18 },
      2: { cellWidth: 34 },
      3: { cellWidth: 28, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const v = String(data.cell.raw);
        data.cell.styles.textColor = v.startsWith('-') ? RED : GREEN;
      }
    },
    didDrawPage: (data) => {
      doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(...FAINT);
      doc.text(
        'Generated by Ledgr · parsed in memory, nothing stored',
        M,
        290,
      );
      doc.text(`Page ${data.pageNumber}`, W - M, 290, { align: 'right' });
    },
  });

  return { doc, filename: `Ledgr-${label.replace(/\s+/g, '-')}.pdf` };
}

function title(doc: jsPDF, text: string, x: number, y: number): number {
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...INK);
  doc.text(text, x, y);
  return y + 7;
}
