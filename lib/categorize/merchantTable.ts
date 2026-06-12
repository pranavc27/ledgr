import { Category } from './types';

/**
 * Pass 1 — deterministic merchant matching. Cheap, offline, and handles the
 * fat head of Indian consumer spend so the LLM only sees the long tail.
 *
 * Each entry maps a normalized keyword to a clean display name + bucket. We
 * match by substring against the normalized narration, longest keyword first
 * so " amazon pay " wins over a bare "amazon" when both could apply.
 */
interface MerchantEntry {
  keyword: string;
  merchant: string;
  category: Category;
}

const TABLE: MerchantEntry[] = [
  // Food & Dining
  { keyword: 'swiggy', merchant: 'Swiggy', category: 'Food & Dining' },
  { keyword: 'zomato', merchant: 'Zomato', category: 'Food & Dining' },
  { keyword: 'eatclub', merchant: 'EatClub', category: 'Food & Dining' },
  { keyword: 'dominos', merchant: "Domino's", category: 'Food & Dining' },
  { keyword: 'mcdonald', merchant: "McDonald's", category: 'Food & Dining' },
  { keyword: 'kfc', merchant: 'KFC', category: 'Food & Dining' },
  { keyword: 'starbucks', merchant: 'Starbucks', category: 'Food & Dining' },
  { keyword: 'chaayos', merchant: 'Chaayos', category: 'Food & Dining' },
  { keyword: 'faasos', merchant: 'Faasos', category: 'Food & Dining' },
  { keyword: 'behrouz', merchant: 'Behrouz Biryani', category: 'Food & Dining' },

  // Groceries / quick-commerce
  { keyword: 'blinkit', merchant: 'Blinkit', category: 'Groceries' },
  { keyword: 'grofers', merchant: 'Blinkit', category: 'Groceries' },
  { keyword: 'instamart', merchant: 'Swiggy Instamart', category: 'Groceries' },
  { keyword: 'instama', merchant: 'Swiggy Instamart', category: 'Groceries' },
  { keyword: 'zepto', merchant: 'Zepto', category: 'Groceries' },
  { keyword: 'bigbasket', merchant: 'BigBasket', category: 'Groceries' },
  { keyword: 'bbnow', merchant: 'BigBasket', category: 'Groceries' },
  { keyword: 'dmart', merchant: 'DMart', category: 'Groceries' },
  { keyword: 'jiomart', merchant: 'JioMart', category: 'Groceries' },
  { keyword: 'licious', merchant: 'Licious', category: 'Groceries' },
  { keyword: 'milkbasket', merchant: 'Milkbasket', category: 'Groceries' },
  { keyword: 'country delight', merchant: 'Country Delight', category: 'Groceries' },

  // Travel & Transport
  { keyword: 'irctc', merchant: 'IRCTC', category: 'Travel & Transport' },
  { keyword: 'uber', merchant: 'Uber', category: 'Travel & Transport' },
  { keyword: 'ola', merchant: 'Ola', category: 'Travel & Transport' },
  { keyword: 'olacabs', merchant: 'Ola', category: 'Travel & Transport' },
  { keyword: 'rapido', merchant: 'Rapido', category: 'Travel & Transport' },
  { keyword: 'redbus', merchant: 'RedBus', category: 'Travel & Transport' },
  { keyword: 'makemytrip', merchant: 'MakeMyTrip', category: 'Travel & Transport' },
  { keyword: 'goibibo', merchant: 'Goibibo', category: 'Travel & Transport' },
  { keyword: 'ixigo', merchant: 'ixigo', category: 'Travel & Transport' },
  { keyword: 'indigo', merchant: 'IndiGo', category: 'Travel & Transport' },
  { keyword: 'vistara', merchant: 'Vistara', category: 'Travel & Transport' },
  { keyword: 'fastag', merchant: 'FASTag', category: 'Travel & Transport' },
  { keyword: 'iocl', merchant: 'Indian Oil', category: 'Travel & Transport' },
  { keyword: 'hpcl', merchant: 'HP Petrol', category: 'Travel & Transport' },
  { keyword: 'bpcl', merchant: 'Bharat Petroleum', category: 'Travel & Transport' },

  // Shopping
  { keyword: 'amazon', merchant: 'Amazon', category: 'Shopping' },
  { keyword: 'flipkart', merchant: 'Flipkart', category: 'Shopping' },
  { keyword: 'myntra', merchant: 'Myntra', category: 'Shopping' },
  { keyword: 'ajio', merchant: 'AJIO', category: 'Shopping' },
  { keyword: 'meesho', merchant: 'Meesho', category: 'Shopping' },
  { keyword: 'nykaa', merchant: 'Nykaa', category: 'Shopping' },
  { keyword: 'tatacliq', merchant: 'Tata CLiQ', category: 'Shopping' },
  { keyword: 'decathlon', merchant: 'Decathlon', category: 'Shopping' },
  { keyword: 'lenskart', merchant: 'Lenskart', category: 'Shopping' },
  { keyword: 'ikea', merchant: 'IKEA', category: 'Shopping' },

  // Bills & Utilities
  { keyword: 'jio', merchant: 'Jio', category: 'Bills & Utilities' },
  { keyword: 'airtel', merchant: 'Airtel', category: 'Bills & Utilities' },
  { keyword: 'vodafone', merchant: 'Vi', category: 'Bills & Utilities' },
  { keyword: 'bescom', merchant: 'BESCOM', category: 'Bills & Utilities' },
  { keyword: 'mseb', merchant: 'MSEB', category: 'Bills & Utilities' },
  { keyword: 'adani electricity', merchant: 'Adani Electricity', category: 'Bills & Utilities' },
  { keyword: 'tata power', merchant: 'Tata Power', category: 'Bills & Utilities' },
  { keyword: 'tneb', merchant: 'TNEB', category: 'Bills & Utilities' },
  { keyword: 'act fibernet', merchant: 'ACT Fibernet', category: 'Bills & Utilities' },
  { keyword: 'tatasky', merchant: 'Tata Play', category: 'Bills & Utilities' },
  { keyword: 'tata play', merchant: 'Tata Play', category: 'Bills & Utilities' },

  // Entertainment
  { keyword: 'netflix', merchant: 'Netflix', category: 'Entertainment' },
  { keyword: 'spotify', merchant: 'Spotify', category: 'Entertainment' },
  { keyword: 'hotstar', merchant: 'Disney+ Hotstar', category: 'Entertainment' },
  { keyword: 'disney', merchant: 'Disney+ Hotstar', category: 'Entertainment' },
  { keyword: 'prime video', merchant: 'Prime Video', category: 'Entertainment' },
  { keyword: 'sonyliv', merchant: 'SonyLIV', category: 'Entertainment' },
  { keyword: 'zee5', merchant: 'ZEE5', category: 'Entertainment' },
  { keyword: 'jiocinema', merchant: 'JioCinema', category: 'Entertainment' },
  { keyword: 'bookmyshow', merchant: 'BookMyShow', category: 'Entertainment' },
  { keyword: 'pvr', merchant: 'PVR Cinemas', category: 'Entertainment' },
  { keyword: 'inox', merchant: 'INOX', category: 'Entertainment' },
  { keyword: 'youtube', merchant: 'YouTube Premium', category: 'Entertainment' },

  // Health
  { keyword: 'pharmeasy', merchant: 'PharmEasy', category: 'Health' },
  { keyword: '1mg', merchant: 'Tata 1mg', category: 'Health' },
  { keyword: 'netmeds', merchant: 'Netmeds', category: 'Health' },
  { keyword: 'apollo', merchant: 'Apollo Pharmacy', category: 'Health' },
  { keyword: 'practo', merchant: 'Practo', category: 'Health' },
  { keyword: 'cult', merchant: 'cult.fit', category: 'Health' },
  { keyword: 'cultfit', merchant: 'cult.fit', category: 'Health' },

  // Investments
  { keyword: 'zerodha', merchant: 'Zerodha', category: 'Investments' },
  { keyword: 'groww', merchant: 'Groww', category: 'Investments' },
  { keyword: 'upstox', merchant: 'Upstox', category: 'Investments' },
  { keyword: 'indmoney', merchant: 'INDmoney', category: 'Investments' },
  { keyword: 'coin', merchant: 'Zerodha Coin', category: 'Investments' },
  { keyword: 'kuvera', merchant: 'Kuvera', category: 'Investments' },
  { keyword: 'smallcase', merchant: 'smallcase', category: 'Investments' },
];

// Match longest keywords first to avoid a generic substring shadowing a
// more specific one.
const SORTED = [...TABLE].sort((a, b) => b.keyword.length - a.keyword.length);

/**
 * Normalize a raw narration for matching: lowercase, strip UPI scaffolding
 * (refs, IFSC codes, phone numbers, symbols) down to spaced word tokens.
 * Also returned (cached) for use as the per-request dedup key.
 */
export function normalizeNarration(narration: string): string {
  return narration
    .toLowerCase()
    .replace(/[^a-z0-9@]+/g, ' ') // keep @ so VPA detection can see it later
    .replace(/\b\d{6,}\b/g, ' ') // drop long ref/phone numbers
    .replace(/\s+/g, ' ')
    .trim();
}

export interface MerchantMatch {
  merchant: string;
  category: Category;
}

/** Return a deterministic merchant match, or null for the LLM/P2P stages. */
export function matchMerchant(normalized: string): MerchantMatch | null {
  const padded = ` ${normalized} `;
  for (const e of SORTED) {
    if (padded.includes(e.keyword)) {
      return { merchant: e.merchant, category: e.category };
    }
  }
  return null;
}
