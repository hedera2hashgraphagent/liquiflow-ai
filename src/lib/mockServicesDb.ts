/**
 * Decentralized Intellectual Services Marketplace — mock provider catalog.
 */

import { PLATFORM_NETWORK_FEE_HBAR } from "./ap2";

export { PLATFORM_NETWORK_FEE_HBAR };

export interface ServiceListing {
  id: number;
  category: string;
  providerName: string;
  rating: number;
  priceHbar: number;
}

export const mockServicesDb: ServiceListing[] = [
  {
    id: 1,
    category: "Web3 Consulting",
    providerName: "Global Tech Hub",
    rating: 4.5,
    priceHbar: 0.25,
  },
  {
    id: 2,
    category: "Web3 Consulting",
    providerName: "Dr. Aram (Expert)",
    rating: 4.9,
    priceHbar: 0.15,
  },
  {
    id: 3,
    category: "Web3 Consulting",
    providerName: "CryptoAdvisors LLC",
    rating: 4.2,
    priceHbar: 0.3,
  },
  {
    id: 4,
    category: "Web3 Consulting",
    providerName: "NextGen Web3",
    rating: 4.7,
    priceHbar: 0.18,
  },
  {
    id: 5,
    category: "Web3 Consulting",
    providerName: "DecentralizeMe",
    rating: 4.6,
    priceHbar: 0.12,
  },
  {
    id: 6,
    category: "Web3 Consulting",
    providerName: "Elite Blockchain",
    rating: 5.0,
    priceHbar: 0.5,
  },
  {
    id: 7,
    category: "Smart Contract Audit",
    providerName: "SecureCode",
    rating: 4.8,
    priceHbar: 0.4,
  },
  {
    id: 8,
    category: "Smart Contract Audit",
    providerName: "AuditChain Pro",
    rating: 4.6,
    priceHbar: 0.55,
  },
  {
    id: 9,
    category: "Smart Contract Audit",
    providerName: "SafeLedger Labs",
    rating: 4.9,
    priceHbar: 0.35,
  },
  {
    id: 10,
    category: "Psychological Support",
    providerName: "MindCare Online",
    rating: 4.8,
    priceHbar: 0.1,
  },
  {
    id: 11,
    category: "Psychological Support",
    providerName: "Wellness DAO",
    rating: 4.5,
    priceHbar: 0.14,
  },
  {
    id: 12,
    category: "Legal Advisory",
    providerName: "ChainLaw Partners",
    rating: 4.7,
    priceHbar: 0.22,
  },
  {
    id: 13,
    category: "Legal Advisory",
    providerName: "Token Counsel",
    rating: 4.4,
    priceHbar: 0.18,
  },
];

/** Keywords used to infer category intent from free-text user requests. */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Web3 Consulting": [
    "web3",
    "web 3",
    "consulting",
    "consultant",
    "blockchain advice",
    "defi advice",
  ],
  "Smart Contract Audit": [
    "audit",
    "smart contract",
    "contract review",
    "security review",
    "code review",
  ],
  "Psychological Support": [
    "psychological",
    "psychology",
    "therapy",
    "mental health",
    "counseling",
    "counselling",
    "support",
    "mindcare",
  ],
  "Legal Advisory": [
    "legal",
    "lawyer",
    "attorney",
    "compliance",
    "regulatory",
  ],
};

export const MARKETPLACE_CATEGORIES = [
  ...new Set(mockServicesDb.map((s) => s.category)),
];

/** Extracts the most likely service category from a user message. */
export function extractCategoryIntent(userMessage: string): string | null {
  const normalized = userMessage.toLowerCase();

  let bestCategory: string | null = null;
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        score += keyword.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

/** Filters by category, sorts by price ascending, returns the cheapest provider. */
export function findCheapestService(category: string): ServiceListing | null {
  const matches = mockServicesDb
    .filter((s) => s.category.toLowerCase() === category.toLowerCase())
    .sort((a, b) => a.priceHbar - b.priceHbar);

  return matches[0] ?? null;
}

/** Total payable amount: expert service fee + platform matchmaking fee. */
export function calculateMarketplaceTotal(servicePriceHbar: number): number {
  return (
    Math.round((servicePriceHbar + PLATFORM_NETWORK_FEE_HBAR) * 100) / 100
  );
}

/** Dynamic AI reply after matchmaking completes. */
export function buildMatchmakingReply(service: ServiceListing): string {
  return (
    `I searched through multiple providers for '${service.category}' and found the most affordable option. ` +
    `Provider: '${service.providerName}'. The service fee is ${service.priceHbar} HBAR. ` +
    `My matchmaking network fee is ${PLATFORM_NETWORK_FEE_HBAR} HBAR.`
  );
}
