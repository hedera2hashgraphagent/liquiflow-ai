/**
 * HashScan URL helpers and consensus timestamp resolution.
 */

import {
  HEDERA_TESTNET_MIRROR,
  type HederaPaymentReceipt,
} from "./hedera-constants";

const MIRROR_REST_BASE = `https://${HEDERA_TESTNET_MIRROR.split(":")[0]}`;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Formats a Hedera transaction ID for HashScan URLs.
 * e.g. 0.0.9168687@1781120320.859088466 → 0.0.9168687-1781120320-859088466
 */
export function formatTransactionIdForHashscan(transactionId: string): string {
  return transactionId.replace("@", "-").replace(/\.([0-9]+)$/, "-$1");
}

/** HashScan direct transaction URL using a formatted transaction ID. */
export function getHashscanTransactionUrl(transactionId: string): string {
  const formattedTxId = formatTransactionIdForHashscan(transactionId);
  return `https://hashscan.io/testnet/transaction/${formattedTxId}`;
}

/** HashScan search fallback when the transaction ID is unavailable. */
export function getHashscanSearchUrl(transactionId: string): string {
  return `https://hashscan.io/testnet/search?q=${encodeURIComponent(transactionId)}`;
}

/** Picks the best HashScan URL for a payment receipt. */
export function getHashscanExplorerUrl(
  receipt: Pick<HederaPaymentReceipt, "transactionId" | "consensusTimestamp">,
): string {
  if (receipt.transactionId) {
    return getHashscanTransactionUrl(receipt.transactionId);
  }
  return getHashscanSearchUrl("");
}

/** Converts a Hedera transaction ID to mirror REST API path segment. */
export function transactionIdToMirrorPath(transactionId: string): string {
  return transactionId.replace("@", "-");
}

async function fetchConsensusTimestampFromMirror(
  transactionId: string,
  maxAttempts: number,
  delayMs: number,
): Promise<string | null> {
  const pathId = transactionIdToMirrorPath(transactionId);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(
        `${MIRROR_REST_BASE}/api/v1/transactions/${pathId}`,
      );

      if (response.ok) {
        const data = (await response.json()) as {
          transactions?: Array<{ consensus_timestamp?: string }>;
        };
        const timestamp = data.transactions?.[0]?.consensus_timestamp;
        if (timestamp) {
          return timestamp;
        }
      }
    } catch {
      // Mirror may not have indexed the transaction yet.
    }

    if (attempt < maxAttempts - 1) {
      await sleep(delayMs);
    }
  }

  return null;
}

async function fetchConsensusTimestampFromSdk(
  transactionId: string,
  maxAttempts: number,
  delayMs: number,
): Promise<string | null> {
  const { Client, TransactionId, TransactionRecordQuery } = await import(
    "@hiero-ledger/sdk"
  );

  const client = Client.forTestnet();

  try {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const record = await new TransactionRecordQuery()
          .setTransactionId(TransactionId.fromString(transactionId))
          .execute(client);

        if (record.consensusTimestamp) {
          return record.consensusTimestamp.toString();
        }
      } catch {
        // Record is often unavailable for a short period after submission.
      }

      if (attempt < maxAttempts - 1) {
        await sleep(delayMs);
      }
    }
  } finally {
    client.close();
  }

  return null;
}

/**
 * Resolves the on-ledger consensus timestamp for a submitted transaction.
 * Uses the Hedera SDK record query first, then falls back to the mirror REST API.
 */
export async function resolveConsensusTimestamp(
  transactionId: string,
  options?: { maxAttempts?: number; delayMs?: number },
): Promise<string | null> {
  const maxAttempts = options?.maxAttempts ?? 6;
  const delayMs = options?.delayMs ?? 1500;

  const fromSdk = await fetchConsensusTimestampFromSdk(
    transactionId,
    maxAttempts,
    delayMs,
  );
  if (fromSdk) {
    return fromSdk;
  }

  return fetchConsensusTimestampFromMirror(transactionId, maxAttempts, delayMs);
}
