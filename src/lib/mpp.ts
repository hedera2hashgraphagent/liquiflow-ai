/**
 * MPP — Multi-Party Payment (Hedera TransferTransaction)
 *
 * A single atomic TransferTransaction debits the payer and credits
 * multiple recipients in one on-ledger operation — the MPP standard
 * demonstrated in LiquiFlow's AP2 payment flow.
 */

import {
  TransferTransaction,
  Hbar,
  AccountId,
  LedgerId,
} from "@hiero-ledger/sdk";
import type { AP2PaymentRequest } from "./ap2";
import { HEDERA_TESTNET_NODE_ID } from "./hedera-constants";

export interface BuildMPPTransactionParams {
  /** Connected wallet account that pays the fee */
  payerAccountId: string;
  /** AP2 request containing split_recipients */
  payment: AP2PaymentRequest;
  /** Optional memo for audit trail on Hedera */
  memo?: string;
}

/**
 * Builds an MPP TransferTransaction from an AP2 payment request.
 *
 * Hedera requires the payer line to debit the full outgoing amount;
 * each split_recipients entry receives its share in the same transaction.
 */
export function buildMPPTransferTransaction({
  payerAccountId,
  payment,
  memo = "LiquiFlow AP2 / MPP premium fee",
}: BuildMPPTransactionParams): TransferTransaction {
  const payer = AccountId.fromString(payerAccountId);
  const totalHbar = new Hbar(payment.amount_hbar);

  let tx = new TransferTransaction()
    .addHbarTransfer(payer, totalHbar.negated())
    .setTransactionMemo(memo);

  for (const recipient of payment.split_recipients) {
    tx = tx.addHbarTransfer(
      AccountId.fromString(recipient.account),
      new Hbar(recipient.amount),
    );
  }

  // Explicit Testnet node — required before freezeWithSigner / freezeWith
  return tx.setNodeAccountIds([
    AccountId.fromString(HEDERA_TESTNET_NODE_ID),
  ]);
}

/** Resolves LedgerId for WalletConnect / SDK initialization. */
export function getTestnetLedgerId(): LedgerId {
  return LedgerId.TESTNET;
}
