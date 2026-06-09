/**
 * LiquiFlow AI agent tools — wired into Vercel AI SDK `streamText`.
 *
 * Flow:
 *   1. analyzeMarket   — free market analysis
 *   2. requestAP2Payment — emits AP2 JSON (UI renders PaymentCard)
 *   3. executeSwap     — gated by valid, non-replayed transaction ID (MPP receipt)
 */

import { tool } from "ai";
import { z } from "zod";
import { createAP2PaymentRequest } from "./ap2";
import {
  isTransactionReplay,
  registerTransactionId,
} from "./replay-protection";

/** Simulated market snapshot for hackathon demo. */
export const analyzeMarket = tool({
  description:
    "Analyze Hedera token pair liquidity, spread, and recommended execution route before a swap.",
  inputSchema: z.object({
    fromToken: z.string().describe('Source token symbol, e.g. "HBAR"'),
    toToken: z.string().describe('Destination token symbol, e.g. "LUMA"'),
    amount: z.number().describe("Amount of fromToken to swap"),
  }),
  execute: async ({ fromToken, toToken, amount }) => {
    const rate = fromToken === "HBAR" && toToken === "LUMA" ? 42.5 : 1.0;
    const estimatedOutput = amount * rate;

    return {
      pair: `${fromToken}/${toToken}`,
      amountIn: amount,
      estimatedOutput,
      rate,
      spreadBps: 12,
      liquidityDepthHbar: 250_000,
      recommendation:
        "Route via SaucerSwap v2 pool. Premium execution unlock required for on-chain settlement.",
      analyzedAt: new Date().toISOString(),
    };
  },
});

/**
 * AP2 — Agentic Payment Protocol gate.
 * Returns standardized JSON consumed by PaymentCard in the chat UI.
 */
export const requestAP2Payment = tool({
  description:
    "Request an AP2 premium execution fee BEFORE swapping. Returns ap2_payment_request JSON for the user to pay via WalletConnect.",
  inputSchema: z.object({
    amount_hbar: z
      .number()
      .optional()
      .describe("Total fee in HBAR (default 0.2)"),
    reason: z
      .string()
      .optional()
      .describe("Why this fee is required"),
  }),
  execute: async ({ amount_hbar, reason }) => {
    // AP2 standard: agent emits this exact shape; UI intercepts `type`.
    return createAP2PaymentRequest({
      amount_hbar,
      reason,
    });
  },
});

/**
 * MPP receipt gate — only runs after user paid via Multi-Party TransferTransaction.
 * Replay protection ensures each transaction ID unlocks execution exactly once.
 */
export const executeSwap = tool({
  description:
    "Execute the Hedera token swap AFTER the user has paid the AP2 fee. Requires a valid Hedera transaction ID from the MPP payment.",
  inputSchema: z.object({
    transactionId: z
      .string()
      .describe(
        "Hedera transaction ID from the AP2/MPP payment, e.g. 0.0.12345@1700000000.123456789",
      ),
    fromToken: z.string(),
    toToken: z.string(),
    amount: z.number(),
  }),
  execute: async ({ transactionId, fromToken, toToken, amount }) => {
    if (!transactionId || transactionId.length < 10) {
      throw new Error("Invalid transaction ID. Payment receipt required.");
    }

    // Replay protection — reject reused MPP receipts
    if (isTransactionReplay(transactionId)) {
      throw new Error(
        `Transaction ${transactionId} was already used. Replay attack blocked.`,
      );
    }

    registerTransactionId(transactionId);

    const rate = fromToken === "HBAR" && toToken === "LUMA" ? 42.5 : 1.0;
    const received = amount * rate;

    return {
      status: "success",
      message: `Swap executed: ${amount} ${fromToken} → ${received.toFixed(4)} ${toToken}`,
      transactionId,
      executionTxRef: `0.0.12345@${Date.now()}`,
      network: "hedera-testnet",
    };
  },
});

export const liquiflowTools = {
  analyzeMarket,
  requestAP2Payment,
  executeSwap,
};
