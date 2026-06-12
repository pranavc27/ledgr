/**
 * PDF layout diagnostic. Run this on a real statement to see how the text
 * extracts, so the HDFC parser can be tuned to the actual column layout.
 *
 *   npx tsx debug-pdf.ts "C:\path\to\statement.pdf" "PDF_PASSWORD"
 *
 * Runs locally; prints positioned text rows (x-tagged) for the first pages.
 * Paste the output back to get the parser fixed.
 */
import { extractPdfText } from './lib/parsers/pdfText';
import { hdfcParser } from './lib/parsers/hdfc';
import { readFileSync } from 'node:fs';

async function main() {
  const [, , filePath, password] = process.argv;
  if (!filePath) {
    console.error('Usage: npx tsx debug-pdf.ts "<path-to-pdf>" "<password>"');
    process.exit(1);
  }

  const buffer = readFileSync(filePath);
  let items;
  try {
    items = await extractPdfText(buffer, password);
  } catch (e: any) {
    console.error(`\nFAILED to read PDF: ${e.code ?? ''} ${e.message}\n`);
    process.exit(1);
  }

  const pages = Math.max(...items.map((i) => i.page));
  console.log(`\nPages: ${pages} | total text fragments: ${items.length}\n`);

  // Group into visual rows by (page, y) with a small tolerance.
  const sorted = [...items].sort((a, b) =>
    a.page !== b.page ? a.page - b.page : a.y - b.y || a.x - b.x,
  );
  type Row = { page: number; y: number; items: typeof items };
  const rows: Row[] = [];
  for (const it of sorted) {
    const last = rows[rows.length - 1];
    if (last && last.page === it.page && Math.abs(it.y - last.y) <= 3) {
      last.items.push(it);
    } else {
      rows.push({ page: it.page, y: it.y, items: [it] });
    }
  }

  // Print the first 55 rows across the first 2 pages, x-tagged.
  let printed = 0;
  for (const row of rows) {
    if (row.page > 2) break;
    if (printed++ > 55) break;
    const cells = row.items
      .sort((a, b) => a.x - b.x)
      .map((i) => `[x=${Math.round(i.x)}] ${i.text}`)
      .join('   ');
    console.log(`p${row.page} y=${Math.round(row.y)}  ${cells}`);
  }

  // Report where the header keywords land (drives column detection).
  console.log('\n--- header keyword x-positions (page 1) ---');
  const p1 = items.filter((i) => i.page === 1);
  for (const kw of ['Date', 'Narration', 'Chq', 'Value', 'Withdrawal', 'Deposit', 'Closing']) {
    const hit = p1.find((i) => new RegExp(`^${kw}`, 'i').test(i.text.trim()));
    console.log(`${kw.padEnd(12)} ${hit ? `x=${Math.round(hit.x)}  "${hit.text}"` : 'NOT FOUND'}`);
  }

  // Run the real parser end-to-end and show what it produced.
  console.log('\n--- parser output ---');
  try {
    const txns = await hdfcParser.parse({ buffer, filename: 'statement.pdf', password });
    console.log(`Parsed ${txns.length} transactions. First few:`);
    for (const t of txns.slice(0, 8)) {
      const amt = t.debit > 0 ? `-${t.debit}` : `+${t.credit}`;
      console.log(`  ${t.date}  ${amt.padStart(12)}  bal ${t.balance}  ${t.narration.slice(0, 50)}`);
    }
  } catch (e: any) {
    console.log(`Parser failed: ${e.code ?? ''} ${e.message}`);
  }
  console.log('');
}

main();
