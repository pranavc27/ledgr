import { hdfcParser } from './parsers/hdfc';
import { runPipeline } from './pipeline';
import { CategorizedTransaction, PipelineStats } from './categorize/types';

/**
 * The full parse → categorize pipeline, shared by the Vercel function
 * (api/parse.ts) and the local dev server (dev-server.ts) so there's exactly
 * one code path. Stateless: nothing is written anywhere.
 */
export interface ProcessResult {
  transactions: CategorizedTransaction[];
  stats: PipelineStats;
  llmUsed: boolean;
  llmError: string | null;
}

export async function processStatement(input: {
  buffer: Buffer;
  filename: string;
  password?: string;
}): Promise<ProcessResult> {
  const transactions = await hdfcParser.parse({
    buffer: input.buffer,
    filename: input.filename.toLowerCase(),
    password: input.password,
  });
  const result = await runPipeline(transactions);
  return {
    transactions: result.transactions,
    stats: result.stats,
    llmUsed: result.llmUsed,
    llmError: result.llmError ?? null,
  };
}

/** Maps typed ParseError codes to HTTP status codes. */
export const ERROR_STATUS: Record<string, number> = {
  PASSWORD_REQUIRED: 422,
  WRONG_PASSWORD: 422,
  UNSUPPORTED_FORMAT: 415,
  NO_TRANSACTIONS: 422,
  PARSE_FAILED: 422,
};
