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
export const AP2_DEFAULT_RECIPIENTS: AP2SplitRecipient[] = [
  { account: "0.0.11111", amount: 8 },
  { account: "0.0.22222", amount: 2 },
];

/** Default premium execution fee (HBAR). */
export const AP2_DEFAULT_FEE_HBAR = 10;

/**
 * Builds a valid AP2 payment request object.
 * Used by the `requestAP2Payment` tool on the server.
 */
export function createAP2PaymentRequest(
  overrides?: Partial<Omit<AP2PaymentRequest, "type">>,
): AP2PaymentRequest {
  const split_recipients =
    overrides?.split_recipients ?? AP2_DEFAULT_RECIPIENTS;
  const amount_hbar =
    overrides?.amount_hbar ??
    split_recipients.reduce((sum, r) => sum + r.amount, 0);

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
