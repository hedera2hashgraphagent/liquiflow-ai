"use client";

/**
 * AP2 Payment Card — intercepts `ap2_payment_request` tool output.
 *
 * Renders the standardized AP2 JSON and triggers MPP (Multi-Party Payment)
 * via WalletConnect when the user clicks "Pay to Unlock Execution".
 */

import { useState } from "react";
import type { AP2PaymentRequest } from "@/lib/ap2";
import type { HederaPaymentReceipt } from "@/lib/hedera-constants";
import { getHashscanExplorerUrl } from "@/lib/hashscan";
import { useWallet } from "@/providers/WalletProvider";

interface PaymentCardProps {
  payment: AP2PaymentRequest;
  /** Called with Hedera transaction ID after successful MPP payment */
  onPaymentSuccess: (transactionId: string) => void;
}

export function PaymentCard({ payment, onPaymentSuccess }: PaymentCardProps) {
  const { isConnected, connect, executeAP2Payment } = useWallet();
  const [status, setStatus] = useState<"idle" | "paying" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<HederaPaymentReceipt | null>(null);

  async function handlePay() {
    setError(null);

    if (!isConnected) {
      try {
        await connect();
      } catch {
        setError("Wallet connection cancelled or failed.");
        return;
      }
    }

    setStatus("paying");
    try {
      // MPP: one TransferTransaction, multiple recipient credits
      const paymentReceipt = await executeAP2Payment(payment);
      setReceipt(paymentReceipt);
      setStatus("success");
      onPaymentSuccess(paymentReceipt.transactionId);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Payment failed");
    }
  }

  return (
    <div className="my-3 w-full max-w-md overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-950/40 shadow-xl shadow-emerald-900/20">
      {/* AP2 protocol badge */}
      <div className="flex items-center justify-between border-b border-emerald-500/20 bg-emerald-500/10 px-4 py-2">
        <span className="text-xs font-bold tracking-widest text-emerald-400">
          AP2 PAYMENT REQUEST
        </span>
        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
          MPP Split
        </span>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <p className="text-sm text-zinc-400">Premium execution fee</p>
          <p className="mt-1 text-3xl font-bold text-white">
            {payment.amount_hbar}{" "}
            <span className="text-lg font-medium text-emerald-400">ℏ</span>
          </p>
        </div>

        <p className="text-sm leading-relaxed text-zinc-300">{payment.reason}</p>

        {/* MPP split breakdown */}
        <div className="rounded-xl border border-zinc-700/80 bg-zinc-950/60 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Multi-Party Recipients
          </p>
          <ul className="space-y-2">
            {payment.split_recipients.map((r) => (
              <li
                key={r.account}
                className="flex items-center justify-between font-mono text-sm"
              >
                <span className="text-zinc-400">{r.account}</span>
                <span className="text-emerald-300">{r.amount} ℏ</span>
              </li>
            ))}
          </ul>
        </div>

        {status === "success" && receipt && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
            <p className="text-xs font-medium text-emerald-400">
              Transaction Successful
            </p>
            <a
              href={getHashscanExplorerUrl(receipt)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block font-mono text-xs text-emerald-300/90 underline decoration-emerald-500/40 underline-offset-2 transition hover:text-emerald-200 hover:decoration-emerald-400"
            >
              View on HashScan
            </a>
            <p className="mt-1 break-all font-mono text-[10px] text-zinc-500">
              {receipt.transactionId}
            </p>
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        {status !== "success" && (
          <button
            type="button"
            onClick={handlePay}
            disabled={status === "paying"}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3 text-sm font-bold text-zinc-950 transition hover:from-emerald-400 hover:to-teal-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "paying"
              ? "Awaiting wallet signature…"
              : "Pay to Unlock Execution"}
          </button>
        )}
      </div>

      {/* Raw AP2 JSON (debug / hackathon judges) */}
      <details className="border-t border-zinc-800 px-4 py-2">
        <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-400">
          View AP2 JSON
        </summary>
        <pre className="mt-2 overflow-x-auto rounded bg-zinc-950 p-2 text-[10px] text-zinc-500">
          {JSON.stringify(payment, null, 2)}
        </pre>
      </details>
    </div>
  );
}
