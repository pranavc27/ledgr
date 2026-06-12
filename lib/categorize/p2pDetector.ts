/**
 * Person-to-person (P2P) detection — the long tail this app exists to handle.
 *
 * HDFC UPI narrations follow a rough grammar:
 *   UPI-<NAME>-<VPA_LOCAL>@<HANDLE>-<IFSC>-<TXNREF>-UPI
 * e.g.  UPI-ARUN ANTONY-PKT-9746251006@OKBIZAXIS-UTIB0000553-...-UPI
 *       UPI-RAMVEER DHAKAD-Q226732165@YBL-YESB0YBLUPI-...-UPI
 *       UPI-EATCLUB-EATCLUB@ICICI-ICIC0DC0099-...-UPI   (merchant, not a person)
 *
 * We only return a person here when the signal is unambiguous: a phone-number
 * UPI handle (e.g. 9746251006@okbizaxis). Named/random handles — which a
 * business and a person can share — are deferred to the LLM, which judges by
 * meaning whether "Anisha Agarwal" is a person and "Google India Digital" is
 * not. This keeps businesses out of the People bucket; the cost is a few more
 * LLM calls (and, with no API key, those rows fall back to "Other").
 */

const BUSINESS_WORDS =
  /\b(pvt|ltd|llp|enterprise|enterprises|store|stores|services|technolog|solutions|payment|payments|recharge|fuel|kirana|traders|agency|hotel|hotels|restaurant|medical|pharma|pharmacy|mart|foods|cater|catering|bazaar|supermarket|electronics|mobile|automobiles|hospital|clinic|college|school|academy|institute|tuition|finserv|finance|capital|fashion|garments|jewell|hardware|industries|company|corporation|infotech|systems)\b/i;

export interface PersonMatch {
  counterparty: string;
}

/** Returns a confident person counterparty, or null to defer to the LLM. */
export function detectPerson(narration: string): PersonMatch | null {
  const upi = parseUpi(narration);
  if (!upi) return null;

  const { name, vpaLocal } = upi;
  const nameClean = name.replace(/\s+/g, ' ').trim();
  if (!nameClean) return null;

  // Obvious businesses are not people.
  if (BUSINESS_WORDS.test(nameClean)) return null;

  // The only unambiguous deterministic signal: the UPI handle's local part is
  // essentially a phone number (a person's mobile). A name@bank / random handle
  // could be either a person or a business, so we defer those to the LLM.
  const digits = vpaLocal.replace(/\D/g, '');
  const isPhoneHandle =
    (digits.length === 10 || digits.length === 12) &&
    digits.length / Math.max(vpaLocal.length, 1) > 0.6;

  return isPhoneHandle ? { counterparty: titleCase(nameClean) } : null;
}

interface UpiParts {
  name: string;
  vpaLocal: string;
  vpaHandle: string;
}

function parseUpi(narration: string): UpiParts | null {
  const n = narration.trim();
  if (!/^upi[-/]/i.test(n)) return null;

  // Split on hyphens primarily; the NAME segment keeps its internal spaces.
  const parts = n.split('-').map((p) => p.trim());
  if (parts.length < 2) return null;

  const name = parts[1];
  const vpaToken = parts.find((p) => p.includes('@'));
  if (!vpaToken) return null;

  const [local, handle] = vpaToken.split('@');
  return { name, vpaLocal: local ?? '', vpaHandle: handle ?? '' };
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}
