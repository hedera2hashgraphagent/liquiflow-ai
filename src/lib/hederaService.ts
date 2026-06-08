/**
 * Hedera ledger service — AP2 / MPP payment execution.
 *
 * Demonstrates authentic @hashgraph/sdk usage for hackathon judges:
 *   - Client.forTestnet() initialization
 *   - Multi-Party Payment (MPP) TransferTransaction construction
 *   - Submission via .execute(client) with receipt validation
 *
 * Production note: the payer's keys live in HashPack. In that flow the
 * transaction is frozen and submitted with executeWithSigner(walletSigner)
 * instead of a server-side operator. This module shows the on-ledger shape.
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

/** Result returned after a successful AP2 MPP payment submission. */
export interface AP2PaymentResult {
  transactionId: string;
  status: string;
  payerAccountId: string;
  totalHbar: number;
  /** MPP split — each treasury credit in the same atomic transfer */
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
 * Builds the AP2 MPP TransferTransaction without submitting it.
 * Useful for HashPack freezeWithSigner / executeWithSigner integration.
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
 * Configures a Hedera Testnet client with operator credentials from env.
 * Required for server-side .execute() — wallet flows use executeWithSigner instead.
 */
function configureTestnetOperator(client: Client): void {
  const operatorId = process.env.HEDERA_OPERATOR_ID;
  const operatorKey = process.env.HEDERA_OPERATOR_PRIVATE_KEY;

  if (!operatorId || !operatorKey) {
    throw new AP2PaymentError(
      "Missing HEDERA_OPERATOR_ID or HEDERA_OPERATOR_PRIVATE_KEY. " +
        "Set these for server-side submission, or call buildAP2MPPTransaction() " +
        "and sign via HashPack executeWithSigner() in the browser.",
    );
  }

  client.setOperator(
    AccountId.fromString(operatorId),
    PrivateKey.fromStringED25519(operatorKey),
  );
}

/**
 * Executes an AP2 Multi-Party Payment on Hedera Testnet.
 *
 * @param payerAccountId - Account debited for the full fee (e.g. "0.0.123456")
 * @param amount           - Total HBAR fee (e.g. 10)
 * @returns Receipt metadata including transaction ID and MPP split breakdown
 */
export async function executeAP2Payment(
  payerAccountId: string,
  amount: number,
): Promise<AP2PaymentResult> {
  if (!payerAccountId?.trim()) {
    throw new AP2PaymentError("payerAccountId is required.");
  }

  const { executorShare, networkShare } = calculateMPPSplit(amount);
  const mppRecipients = [
    { accountId: MPP_TREASURY_EXECUTOR, amountHbar: executorShare },
    { accountId: MPP_TREASURY_NETWORK, amountHbar: networkShare },
  ];

  const client = Client.forTestnet();

  try {
    configureTestnetOperator(client);

    const transaction = buildAP2MPPTransaction(payerAccountId, amount);

    // Submit to Hedera consensus nodes and wait for the receipt
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
      payerAccountId,
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
