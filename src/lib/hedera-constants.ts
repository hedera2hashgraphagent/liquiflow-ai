/** Shared Hedera Testnet constants (no SDK imports — safe for client bundles). */

export const HEDERA_TESTNET_NODE_ID = "0.0.3";

/** HashScan explorer URL for a Hedera Testnet transaction. */
export function getHashscanTxUrl(transactionId: string): string {
  return `https://hashscan.io/testnet/tx/${transactionId}`;
}
