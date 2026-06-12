import { ParseError } from './types';

/** A single positioned text fragment extracted from a PDF page. */
export interface TextItem {
  page: number;
  /** x of the LEFT edge of the fragment (PDF points). */
  x: number;
  /** y measured from the TOP of the page (PDF points), so it increases downward. */
  y: number;
  width: number;
  text: string;
}

/**
 * Decrypt + extract positioned text from a (possibly password-protected) PDF.
 *
 * pdfjs is the only thing in this codebase that knows about PDF internals.
 * It gives us each glyph-run with a transform matrix; we convert that into a
 * flat list of {page, x, y, text} fragments that the HDFC parser can bucket
 * into columns. Password failures are mapped to typed ParseErrors so the API
 * can prompt the user instead of 500ing.
 */
export async function extractPdfText(
  buffer: Buffer,
  password?: string,
): Promise<TextItem[]> {
  // Legacy build runs in Node without a real worker thread.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

  let doc;
  try {
    doc = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      password: password ?? '',
      // Keep it lean + safe inside a serverless function.
      isEvalSupported: false,
      useSystemFonts: false,
      disableFontFace: true,
    }).promise;
  } catch (err: any) {
    // pdfjs PasswordException: code 1 = needs password, 2 = wrong password.
    if (err?.name === 'PasswordException' || err?.code === 1 || err?.code === 2) {
      if (err.code === 2 || /incorrect/i.test(err?.message ?? '')) {
        throw new ParseError('The PDF password is incorrect.', 'WRONG_PASSWORD');
      }
      throw new ParseError(
        'This PDF is password-protected. Please provide the password.',
        'PASSWORD_REQUIRED',
      );
    }
    throw new ParseError(
      `Could not open the PDF: ${err?.message ?? 'unknown error'}`,
      'PARSE_FAILED',
    );
  }

  const items: TextItem[] = [];
  for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
    const page = await doc.getPage(pageNo);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    for (const raw of content.items as any[]) {
      const str: string = raw.str ?? '';
      if (!str.trim()) continue;
      // transform = [a, b, c, d, e, f]; e = x, f = y (from bottom-left).
      const x = raw.transform[4];
      const yFromBottom = raw.transform[5];
      items.push({
        page: pageNo,
        x,
        y: viewport.height - yFromBottom, // flip so y grows downward
        width: raw.width ?? 0,
        text: str,
      });
    }
  }
  return items;
}
