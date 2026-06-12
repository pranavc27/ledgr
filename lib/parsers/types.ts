/**
 * The normalized shape every bank parser must emit. Adding a new bank means
 * writing one module that returns `NormalizedTransaction[]` — nothing
 * downstream (categorization, summary) knows or cares which bank it came from.
 */
export interface NormalizedTransaction {
  /** ISO date string, YYYY-MM-DD. */
  date: string;
  /** Raw narration text, multi-line continuations joined with a single space. */
  narration: string;
  /** Withdrawal amount (money out). 0 if none. */
  debit: number;
  /** Deposit amount (money in). 0 if none. */
  credit: number;
  /** Closing balance after this transaction. */
  balance: number;
  /** Bank reference / cheque number, kept for traceability. May be empty. */
  ref?: string;
}

/** A bank parser. One per supported bank format. */
export interface BankParser {
  /** Human label, e.g. "HDFC Savings". */
  name: string;
  /** Parse already-extracted text rows / sheet into normalized transactions. */
  parse(input: ParserInput): Promise<NormalizedTransaction[]>;
}

export interface ParserInput {
  /** Raw file buffer. */
  buffer: Buffer;
  /** Lowercased original filename, used for format sniffing. */
  filename: string;
  /** Optional password for encrypted PDFs. */
  password?: string;
}

export class ParseError extends Error {
  constructor(message: string, public readonly code: ParseErrorCode) {
    super(message);
    this.name = 'ParseError';
  }
}

export type ParseErrorCode =
  | 'PASSWORD_REQUIRED'
  | 'WRONG_PASSWORD'
  | 'UNSUPPORTED_FORMAT'
  | 'NO_TRANSACTIONS'
  | 'PARSE_FAILED';
