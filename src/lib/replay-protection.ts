/**
 * In-memory replay protection for AP2 / MPP payment receipts.
 *
 * Prevents the same Hedera transaction ID from being submitted twice
 * to unlock premium execution (executeSwap). Production would use Redis
 * or a database with TTL; this hackathon boilerplate uses a process-local Set.
 */

const usedTransactionIds = new Set<string>();

/** Normalize Hedera transaction ID strings for consistent lookup. */
function normalizeTransactionId(txId: string): string {
  return txId.trim().toLowerCase();
}

/**
 * Returns true if this transaction ID was already consumed.
 * Call before accepting a payment receipt for executeSwap.
 */
export function isTransactionReplay(txId: string): boolean {
  return usedTransactionIds.has(normalizeTransactionId(txId));
}

/**
 * Marks a transaction ID as used after successful payment verification.
 * Throws if the ID was already registered (replay attack).
 */
export function registerTransactionId(txId: string): void {
  const normalized = normalizeTransactionId(txId);
  if (usedTransactionIds.has(normalized)) {
    throw new Error(
      `Replay detected: transaction ${txId} was already used to unlock execution.`,
    );
  }
  usedTransactionIds.add(normalized);
}

/** Test helper — clears the in-memory store. */
export function clearReplayStore(): void {
  usedTransactionIds.clear();
}

/** Exposes count for debugging / demo dashboards. */
export function getUsedTransactionCount(): number {
  return usedTransactionIds.size;
}
