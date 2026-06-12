/**
 * Local dev server — run the whole app on one port WITHOUT the Vercel CLI.
 *
 *   npm run build        # build the client once (creates client/dist)
 *   npm run dev:local    # serve client + /api/parse at http://localhost:3000
 *
 * It reuses the exact same pipeline as the deployed function
 * (lib/processStatement.ts), so what you see here is what production does.
 * Still stateless — uploads are parsed in memory and never written to disk.
 */
import { createServer } from 'node:http';
import { readFile, readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import formidable from 'formidable';
import { ParseError } from './lib/parsers/types';
import { ERROR_STATUS, processStatement } from './lib/processStatement';

const PORT = 3000;
const DIST = join(__dirname, 'client', 'dist');
const MAX_FILE_BYTES = 15 * 1024 * 1024;

loadDotEnv();

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/parse') {
    await handleParse(req, res);
    return;
  }
  serveStatic(req.url || '/', res);
});

async function handleParse(req: any, res: any) {
  try {
    const form = formidable({ maxFileSize: MAX_FILE_BYTES, multiples: false });
    const { file, password } = await new Promise<{
      file: formidable.File;
      password?: string;
    }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(new ParseError('Upload failed.', 'PARSE_FAILED'));
        const f = Array.isArray(files.file) ? files.file[0] : files.file;
        if (!f) return reject(new ParseError('No file uploaded.', 'PARSE_FAILED'));
        const p = Array.isArray(fields.password) ? fields.password[0] : fields.password;
        resolve({ file: f, password: p || undefined });
      });
    });

    const buffer = await new Promise<Buffer>((resolve, reject) =>
      readFile(file.filepath, (e, d) => (e ? reject(e) : resolve(d))),
    );
    const result = await processStatement({
      buffer,
      filename: file.originalFilename ?? 'statement',
      password,
    });
    console.log(
      `[parse] ${result.stats.total} txns | deterministic ${result.stats.pass1Pct}% | LLM ${result.stats.llmPct}%`,
    );
    json(res, 200, result);
  } catch (err) {
    if (err instanceof ParseError) {
      json(res, ERROR_STATUS[err.code] ?? 400, { error: err.message, code: err.code });
    } else {
      console.error('[parse] error', err);
      json(res, 500, { error: 'Failed to process the statement.' });
    }
  }
}

function serveStatic(url: string, res: any) {
  if (!existsSync(DIST)) {
    json(res, 500, { error: 'client/dist not found — run `npm run build` first.' });
    return;
  }
  const path = decodeURIComponent(url.split('?')[0]);
  let filePath = join(DIST, path);
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(DIST, 'index.html'); // SPA fallback
  }
  readFile(filePath, (err, data) => {
    if (err) return json(res, 404, { error: 'Not found' });
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

function json(res: any, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

/** Minimal .env loader so GEMINI_API_KEY works without extra dependencies. */
function loadDotEnv() {
  const envPath = join(__dirname, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

server.listen(PORT, () => {
  console.log(`\n  Ledger running →  http://localhost:${PORT}`);
  console.log(
    process.env.GEMINI_API_KEY
      ? '  Gemini key detected — full categorization enabled.\n'
      : '  No GEMINI_API_KEY — deterministic passes only (long tail → "Other").\n',
  );
});
