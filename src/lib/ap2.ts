/**
 * AP2 — Agentic Payment Protocol
 *
 * Standardized payment request format that gates premium agent actions.
 * The AI agent emits this JSON before executing paid DeFi operations.
 * The chat UI intercepts `type: "ap2_payment_request"` and renders PaymentCard.
 */

/** A single recipient in an AP2 multi-party split. */
export interface AP2SplitRecipient {
  /** Hedera account ID, e.g. "0.0.11111" */
  account: string;
  /** Amount in HBAR for this recipient */
  amount: number;
}

/**
 * Canonical AP2 payment request payload.
 * Returned by the `requestAP2Payment` tool and rendered by PaymentCard.
 */
export interface AP2PaymentRequest {
  type: "ap2_payment_request";
  /** Total fee in HBAR (must equal sum of split_recipients amounts) */
  amount_hbar: number;
  /** Human-readable reason shown on the payment card */
  reason: string;
  /** MPP split — multiple recipients in one atomic payment */
  split_recipients: AP2SplitRecipient[];
}

/** Placeholder treasury / fee-split accounts for Hedera Testnet demo. */
export const MPP_MERCHANT_ACCOUNT = "0.0.11111";
export const MPP_AGENT_ACCOUNT = "0.0.22222";

/** Default premium execution fee (HBAR). */
export const AP2_DEFAULT_FEE_HBAR = 0.2;

/** LiquiFlow marketplace platform / matchmaking fee (HBAR). */
export const PLATFORM_NETWORK_FEE_HBAR = 0.05;

/** 80/20 MPP split for a given total fee. */
export function calculateAP2Split(totalHbar: number): {
  merchantSettlement: number;
  agentCommission: number;
} {
  const merchantSettlement = Math.round(totalHbar * 0.8 * 100) / 100;
  const agentCommission = Math.round((totalHbar - merchantSettlement) * 100) / 100;
  return { merchantSettlement, agentCommission };
}

function buildDefaultSplitRecipients(totalHbar: number): AP2SplitRecipient[] {
  const { merchantSettlement, agentCommission } = calculateAP2Split(totalHbar);
  return [
    { account: MPP_MERCHANT_ACCOUNT, amount: merchantSettlement },
    { account: MPP_AGENT_ACCOUNT, amount: agentCommission },
  ];
}

export const AP2_DEFAULT_RECIPIENTS: AP2SplitRecipient[] =
  buildDefaultSplitRecipients(AP2_DEFAULT_FEE_HBAR);

/** MPP split for intellectual-services marketplace settlements. */
export function createMarketplacePaymentRequest(service: {
  category: string;
  providerName: string;
  priceHbar: number;
}): AP2PaymentRequest {
  const amount_hbar =
    Math.round((service.priceHbar + PLATFORM_NETWORK_FEE_HBAR) * 100) / 100;

  return {
    type: "ap2_payment_request",
    amount_hbar,
    reason: `${service.category} — ${service.providerName}`,
    split_recipients: [
      { account: MPP_MERCHANT_ACCOUNT, amount: service.priceHbar },
      { account: MPP_AGENT_ACCOUNT, amount: PLATFORM_NETWORK_FEE_HBAR },
    ],
  };
}

/**
 * Builds a valid AP2 payment request object.
 * Used by the `requestAP2Payment` tool on the server.
 */
export function createAP2PaymentRequest(
  overrides?: Partial<Omit<AP2PaymentRequest, "type">>,
): AP2PaymentRequest {
  const amount_hbar = overrides?.amount_hbar ?? AP2_DEFAULT_FEE_HBAR;
  const split_recipients =
    overrides?.split_recipients ?? buildDefaultSplitRecipients(amount_hbar);

  return {
    type: "ap2_payment_request",
    amount_hbar,
    reason:
      overrides?.reason ?? "Premium DeFi execution fee",
    split_recipients,
  };
}

/** Type guard for AP2 payloads surfaced in tool outputs or UI. */
export function isAP2PaymentRequest(
  value: unknown,
): value is AP2PaymentRequest {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    obj.type === "ap2_payment_request" &&
    typeof obj.amount_hbar === "number" &&
    typeof obj.reason === "string" &&
    Array.isArray(obj.split_recipients)
  );
}
