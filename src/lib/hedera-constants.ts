/** Shared Hedera Testnet constants (no SDK imports — safe for client bundles). */

/** Consensus node account used for AP2 / MPP transfers. */
export const HEDERA_TESTNET_NODE_ID = "0.0.3";

/** Official Hedera Testnet gRPC endpoint (host from https://testnet.hedera.com). */
export const HEDERA_TESTNET_ENDPOINT = "testnet.hedera.com:50211";

/** Mirror node for receipt / status queries on Testnet. */
export const HEDERA_TESTNET_MIRROR = "testnet.mirrornode.hedera.com:5600";

/** Receipt returned after a successful on-ledger AP2 / MPP payment. */
export interface HederaPaymentReceipt {
  transactionId: string;
  /** Real consensus timestamp from record/receipt; null when not yet resolved. */
  consensusTimestamp: string | null;
}
