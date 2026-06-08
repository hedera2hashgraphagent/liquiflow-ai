/**
 * Hedera ledger service — AP2 / MPP payment execution (Testnet).
 *
 * Server-side operator flow:
 *   1. Client.forTestnet() + setOperator(env credentials)
 *   2. TransferTransaction with explicit node 0.0.3
 *   3. freezeWith(client) → signWithOperator(client) → execute(client)
 */

import {
  AccountId,
  Client,
  Hbar,
  PrivateKey,
  Status,
  TransferTransaction,
} from "@hashgraph/sdk";
import { HEDERA_TESTNET_NODE_ID } from "./hedera-constants";

export { HEDERA_TESTNET_NODE_ID };

/** Mock treasury accounts receiving the MPP fee split (Hedera Testnet). */
export const MPP_TREASURY_EXECUTOR = "0.0.11111";
export const MPP_TREASURY_NETWORK = "0.0.22222";

/** Result returned after a successful AP2 MPP payment submission. */
export interface AP2PaymentResult {
  transactionId: string;
  status: string;
  payerAccountId: string;
  totalHbar: number;
  mppRecipients: Array<{ accountId: string; amountHbar: number }>;
}

/** Typed error for AP2 payment failures (validation, receipt, network). */
export class AP2PaymentError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "AP2PaymentError";
    this.cause = cause;
  }
}

export function calculateMPPSplit(totalHbar: number): {
  executorShare: number;
  networkShare: number;
} {
  if (totalHbar <= 0) {
    throw new AP2PaymentError(`Invalid AP2 fee amount: ${totalHbar} HBAR`);
  }

  const executorShare = Math.round(totalHbar * 0.8 * 100) / 100;
  const networkShare = Math.round((totalHbar - executorShare) * 100) / 100;

  return { executorShare, networkShare };
}

/** Builds an unfrozen MPP TransferTransaction. */
export function buildAP2MPPTransaction(
  payerAccountId: string,
  amount: number,
): TransferTransaction {
  const payer = AccountId.fromString(payerAccountId);
  const { executorShare, networkShare } = calculateMPPSplit(amount);

  return new TransferTransaction()
    .addHbarTransfer(payer, new Hbar(amount).negated())
    .addHbarTransfer(
      AccountId.fromString(MPP_TREASURY_EXECUTOR),
      new Hbar(executorShare),
    )
    .addHbarTransfer(
      AccountId.fromString(MPP_TREASURY_NETWORK),
      new Hbar(networkShare),
    )
    .setTransactionMemo("LiquiFlow AP2 MPP execution fee");
}

/**
 * Step 1 — Initialize Testnet client and set operator from .env.local.
 * Never call this from the browser; operator keys must stay server-side.
 */
export function createTestnetClient(): Client {
  const operatorId = process.env.HEDERA_OPERATOR_ID?.trim();
  const operatorKey = process.env.HEDERA_OPERATOR_PRIVATE_KEY?.trim();

  if (!operatorId || !operatorKey) {
    throw new AP2PaymentError(
      "Missing HEDERA_OPERATOR_ID or HEDERA_OPERATOR_PRIVATE_KEY in .env.local.",
    );
  }

  const client = Client.forTestnet();

  client.setOperator(
    AccountId.fromString(operatorId),
    PrivateKey.fromString(operatorKey),
  );

  return client;
}

/**
 * Step 2 & 3 — Attach client context, set Testnet node, and freeze.
 * freezeWith(client) is mandatory before execute(); it resolves nodeAccountIds.
 */
export function prepareAP2MPPTransaction(
  payerAccountId: string,
  amount: number,
  client: Client,
): TransferTransaction {
  const nodeAccountId = AccountId.fromString(HEDERA_TESTNET_NODE_ID);

  const transaction = buildAP2MPPTransaction(payerAccountId, amount)
    .setNodeAccountIds([nodeAccountId])
    .setMaxTransactionFee(new Hbar(5));

  return transaction.freezeWith(client);
}

/**
 * Executes an AP2 MPP payment on Hedera Testnet using the operator key.
 *
 * The operator account (HEDERA_OPERATOR_ID) must be the debit line — only that
 * key can sign server-side. HashPack user payments use WalletProvider instead.
 */
export async function executeAP2Payment(
  payerAccountId: string,
  amount: number,
): Promise<AP2PaymentResult> {
  if (!payerAccountId?.trim()) {
    throw new AP2PaymentError("payerAccountId is required.");
  }

  const operatorId = process.env.HEDERA_OPERATOR_ID?.trim();
  const payer = payerAccountId.trim();

  if (!operatorId) {
    throw new AP2PaymentError(
      "HEDERA_OPERATOR_ID is not configured in .env.local.",
    );
  }

  if (payer !== operatorId) {
    throw new AP2PaymentError(
      `Server-side executeAP2Payment requires payerAccountId (${payer}) to match ` +
        `HEDERA_OPERATOR_ID (${operatorId}). Use HashPack for user-wallet payments.`,
    );
  }

  const { executorShare, networkShare } = calculateMPPSplit(amount);
  const mppRecipients = [
    { accountId: MPP_TREASURY_EXECUTOR, amountHbar: executorShare },
    { accountId: MPP_TREASURY_NETWORK, amountHbar: networkShare },
  ];

  const client = createTestnetClient();

  try {
    // Step 2–4: build → set node → freezeWith(client)
    let transaction = prepareAP2MPPTransaction(payer, amount, client);

    // Operator signature (required for accounts debiting HBAR)
    transaction = await transaction.signWithOperator(client);

    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);

    if (receipt.status !== Status.Success) {
      throw new AP2PaymentError(
        `AP2 MPP payment failed with status: ${receipt.status.toString()}`,
      );
    }

    return {
      transactionId: txResponse.transactionId.toString(),
      status: receipt.status.toString(),
      payerAccountId: payer,
      totalHbar: amount,
      mppRecipients,
    };
  } catch (error) {
    if (error instanceof AP2PaymentError) {
      throw error;
    }

    throw new AP2PaymentError(
      error instanceof Error
        ? error.message
        : "Unknown error during AP2 MPP payment execution.",
      error,
    );
  } finally {
    client.close();
  }
}
