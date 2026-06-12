import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFile, unlink } from 'node:fs/promises';
import formidable from 'formidable';
import { ParseError } from '../lib/parsers/types';
import { ERROR_STATUS, processStatement } from '../lib/processStatement';

// Multipart upload — let formidable read the raw body, not Vercel's JSON parser.
export const config = { api: { bodyParser: false } };

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let tmpPath: string | undefined;
  try {
    const { filepath, filename, password } = await readUpload(req);
    tmpPath = filepath;

    // Parse fully in-memory. Nothing about this statement is persisted.
    const buffer = await readFile(filepath);
    const result = await processStatement({ buffer, filename, password });

    // Server-side log of the head/tail split for the writeup.
    console.log(
      `[parse] ${result.stats.total} txns | deterministic ` +
        `${result.stats.pass1Pct}% (table+specials+p2p) | LLM ` +
        `${result.stats.llmPct}%`,
    );

    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof ParseError) {
      return res
        .status(ERROR_STATUS[err.code] ?? 400)
        .json({ error: err.message, code: err.code });
    }
    console.error('[parse] unexpected error', err);
    return res.status(500).json({ error: 'Failed to process the statement.' });
  } finally {
    // Best-effort cleanup of the temp upload — leave nothing on disk.
    if (tmpPath) await unlink(tmpPath).catch(() => {});
  }
}

interface Upload {
  filepath: string;
  filename: string;
  password?: string;
}

function readUpload(req: VercelRequest): Promise<Upload> {
  const form = formidable({ maxFileSize: MAX_FILE_BYTES, multiples: false });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(new ParseError('Upload failed or file too large.', 'PARSE_FAILED'));
        return;
      }
      const f = pickFile(files.file);
      if (!f) {
        reject(new ParseError('No file uploaded.', 'PARSE_FAILED'));
        return;
      }
      resolve({
        filepath: f.filepath,
        filename: f.originalFilename ?? 'statement',
        password: pickField(fields.password),
      });
    });
  });
}

function pickFile(v: formidable.File | formidable.File[] | undefined) {
  if (!v) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function pickField(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.length > 0 ? s : undefined;
}
