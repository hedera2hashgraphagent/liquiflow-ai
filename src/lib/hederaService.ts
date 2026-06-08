/**
 * Hedera ledger service — AP2 / MPP payment execution.
 *
 * Server-side path using @hashgraph/sdk:
 *   - Client.forTestnet() with operator from environment
 *   - MPP TransferTransaction with explicit node + freezeWith(client)
 *   - .execute(client) with receipt validation
 *
 * Browser / HashPack path uses freezeWithSigner() via WalletProvider instead.
 */

import {
  AccountId,
  Client,
  Hbar,
  PrivateKey,
  Status,
  TransferTransaction,
} from "@hashgraph/sdk";

/** Mock treasury accounts receiving the MPP fee split (Hedera Testnet). */
export const MPP_TREASURY_EXECUTOR = "0.0.11111";
export const MPP_TREASURY_NETWORK = "0.0.22222";

/** Well-known Hedera Testnet consensus node */
export const HEDERA_TESTNET_NODE_ID = "0.0.3";

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

/**
 * Calculates an 80 / 20 MPP split across executor and network treasuries.
 * For the default 10 HBAR AP2 fee this yields 8 ℏ + 2 ℏ.
 */
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

/**
 * Builds the AP2 MPP TransferTransaction without freezing.
 * Wallet flows call freezeWithSigner(); server flows call prepareAP2MPPTransaction().
 */
export function buildAP2MPPTransaction(
  payerAccountId: string,
  amount: number,
): TransferTransaction {
  const payer = AccountId.fromString(payerAccountId);
  const { executorShare, networkShare } = calculateMPPSplit(amount);
  const totalDebit = new Hbar(amount);

  return new TransferTransaction()
    .addHbarTransfer(payer, totalDebit.negated())
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
 * Creates a Hedera Testnet client with operator credentials from environment.
 * Required for server-side .execute() — never expose these keys to the browser.
 */
export function createTestnetClient(): Client {
  const operatorId = process.env.HEDERA_OPERATOR_ID?.trim();
  const operatorKey = process.env.HEDERA_OPERATOR_PRIVATE_KEY?.trim();

  if (!operatorId || !operatorKey) {
    throw new AP2PaymentError(
      "Missing HEDERA_OPERATOR_ID or HEDERA_OPERATOR_PRIVATE_KEY. " +
        "Add both to .env.local for server-side Testnet submission.",
    );
  }

  const client = Client.forTestnet();

  // fromString auto-detects DER (302e...) and raw ED25519 key formats
  const privateKey = PrivateKey.fromString(operatorKey);

  client.setOperator(AccountId.fromString(operatorId), privateKey);

  return client;
}

/**
 * Assigns a Testnet node, attaches the client, and freezes the transaction.
 * Must be called before .execute(client) to satisfy nodeAccountId requirements.
 */
export function prepareAP2MPPTransaction(
  payerAccountId: string,
  amount: number,
  client: Client,
): TransferTransaction {
  const nodeAccountId = AccountId.fromString(HEDERA_TESTNET_NODE_ID);

  return buildAP2MPPTransaction(payerAccountId, amount)
    .setNodeAccountIds([nodeAccountId])
    .freezeWith(client);
}

/**
 * Executes an AP2 Multi-Party Payment on Hedera Testnet using the operator key.
 *
 * Server-side: the operator account must be the payer (debit line) because only
 * the operator key signs the transaction. For other payer accounts use HashPack
 * executeWithSigner() in WalletProvider.
 *
 * @param payerAccountId - Must match HEDERA_OPERATOR_ID for server submission
 * @param amount           - Total HBAR fee (e.g. 10)
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

  if (operatorId && payer !== operatorId) {
    throw new AP2PaymentError(
      `Server-side executeAP2Payment requires payerAccountId (${payer}) to match ` +
        `HEDERA_OPERATOR_ID (${operatorId}). Connect HashPack to pay from a user wallet.`,
    );
  }

  const { executorShare, networkShare } = calculateMPPSplit(amount);
  const mppRecipients = [
    { accountId: MPP_TREASURY_EXECUTOR, amountHbar: executorShare },
    { accountId: MPP_TREASURY_NETWORK, amountHbar: networkShare },
  ];

  const client = createTestnetClient();
  const effectivePayer = operatorId ?? payer;

  try {
    const frozenTransaction = prepareAP2MPPTransaction(
      effectivePayer,
      amount,
      client,
    );

    const txResponse = await frozenTransaction.execute(client);
    const receipt = await txResponse.getReceipt(client);

    if (receipt.status !== Status.Success) {
      throw new AP2PaymentError(
        `AP2 MPP payment failed with status: ${receipt.status.toString()}`,
      );
    }

    return {
      transactionId: txResponse.transactionId.toString(),
      status: receipt.status.toString(),
      payerAccountId: effectivePayer,
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
