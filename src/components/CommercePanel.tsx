"use client";

import { useState } from "react";
import type { HederaPaymentReceipt } from "@/lib/hedera-constants";
import { getHashscanExplorerUrl } from "@/lib/hashscan";
import {
  useLiquiFlow,
  type CommercePanelState,
} from "@/providers/LiquiFlowProvider";
import { useWallet } from "@/providers/WalletProvider";

const STATE_LABELS: Record<CommercePanelState, string> = {
  idle: "Awaiting Request",
  payment_required: "Payment Required",
  processing: "Processing",
  success: "Complete",
};

export function CommercePanel() {
  const {
    commerceState,
    commerceError,
    lastPaymentReceipt,
    selectedService,
    paymentRequest,
    platformNetworkFeeHbar,
    paymentTotalHbar,
    startPaymentProcessing,
    completePaymentSuccess,
    failPayment,
    resetCommerce,
  } = useLiquiFlow();

  const { isConnected } = useWallet();

  return (
    <aside className="flex h-full w-full flex-col border-l border-zinc-800/80 bg-zinc-950/60 lg:w-[380px] lg:shrink-0">
      <div className="border-b border-zinc-800/80 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-zinc-100">
              Commerce Agent
            </h2>
            <p className="text-[10px] text-zinc-500">AP2 · Hedera Testnet</p>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-300 ${
              commerceState === "payment_required"
                ? "bg-amber-500/20 text-amber-400"
                : commerceState === "processing"
                  ? "bg-blue-500/20 text-blue-400"
                  : commerceState === "success"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-zinc-800 text-zinc-500"
            }`}
          >
            {STATE_LABELS[commerceState]}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div
          key={commerceState}
          className="flex flex-1 flex-col transition-all duration-500 ease-out animate-in fade-in slide-in-from-right-2"
        >
          {commerceState === "idle" && <IdleView />}
          {commerceState === "payment_required" && selectedService && paymentRequest && (
            <PaymentRequiredView
              service={selectedService}
              paymentRequest={paymentRequest}
              platformFee={platformNetworkFeeHbar}
              totalHbar={paymentTotalHbar}
              error={commerceError}
              onFail={failPayment}
              onStart={startPaymentProcessing}
              onSuccess={completePaymentSuccess}
            />
          )}
          {commerceState === "processing" && <ProcessingView />}
          {commerceState === "success" && selectedService && (
            <SuccessView
              service={selectedService}
              platformFee={platformNetworkFeeHbar}
              receipt={lastPaymentReceipt}
              onReset={resetCommerce}
            />
          )}
        </div>

        {!isConnected && commerceState === "payment_required" && (
          <p className="mt-4 text-center text-xs text-amber-400/90 transition-opacity duration-300">
            Connect HashPack in the header to pay execution fees.
          </p>
        )}
      </div>
    </aside>
  );
}

function IdleView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/80">
        <svg
          className="h-8 w-8 text-zinc-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.172-.879-1.172-2.303 0-3.182.553-.44 1.278-.659 2.003-.659.725 0 1.45.22 2.003.659z"
          />
        </svg>
      </div>
      <p className="text-sm font-medium text-zinc-400">
        Intellectual Services Marketplace
      </p>
      <p className="mt-2 max-w-[240px] text-xs leading-relaxed text-zinc-600">
        Ask for a service category in chat. The agent will match you with the
        cheapest provider and open the AP2 payment gate here.
      </p>
    </div>
  );
}

function PaymentRequiredView({
  service,
  paymentRequest,
  platformFee,
  totalHbar,
  error,
  onFail,
  onStart,
  onSuccess,
}: {
  service: import("@/lib/mockServicesDb").ServiceListing;
  paymentRequest: import("@/lib/ap2").AP2PaymentRequest;
  platformFee: number;
  totalHbar: number;
  error: string | null;
  onFail: (message: string) => void;
  onStart: () => void;
  onSuccess: (receipt: HederaPaymentReceipt) => void;
}) {
  const { isConnected, executeAP2Payment } = useWallet();
  const [isPaying, setIsPaying] = useState(false);

  async function handlePay() {
    if (!isConnected) {
      onFail("Please connect your wallet first.");
      return;
    }

    setIsPaying(true);
    onStart();

    try {
      const receipt = await executeAP2Payment(paymentRequest);
      onSuccess(receipt);
    } catch (err) {
      onFail(
        err instanceof Error
          ? err.message
          : "Payment failed. Please try again.",
      );
    } finally {
      setIsPaying(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-zinc-900 to-emerald-950/30 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500/80">
          AP2 Payment Gate
        </p>
        <p className="mt-1 text-sm text-zinc-400">{service.category}</p>
        <p className="mt-0.5 text-base font-semibold text-zinc-100">
          {service.providerName}
        </p>
        <p className="mt-3 text-3xl font-bold text-white">
          {totalHbar}{" "}
          <span className="text-lg font-medium text-emerald-400">ℏ</span>
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          Service {service.priceHbar} ℏ + network fee {platformFee} ℏ — settled
          on Hedera Testnet via MPP.
        </p>

        <ul className="mt-4 space-y-2 border-t border-zinc-800/80 pt-4 text-xs text-zinc-500">
          <li className="flex justify-between">
            <span>Expert service</span>
            <span className="font-mono text-zinc-300">
              {service.priceHbar} HBAR
            </span>
          </li>
          <li className="flex justify-between">
            <span>Platform network fee</span>
            <span className="font-mono text-zinc-300">
              {platformFee} HBAR
            </span>
          </li>
          <li className="flex justify-between border-t border-zinc-800/60 pt-2 font-medium text-zinc-400">
            <span>Total</span>
            <span className="font-mono text-emerald-400">{totalHbar} HBAR</span>
          </li>
          <li className="flex justify-between">
            <span>Rating</span>
            <span className="font-mono text-zinc-400">★ {service.rating}</span>
          </li>
        </ul>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-center text-sm text-red-300 transition-all duration-300"
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handlePay}
        disabled={isPaying}
        className="wallet-glow mt-6 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-4 text-sm font-bold text-zinc-950 shadow-lg shadow-emerald-500/25 transition hover:from-emerald-400 hover:to-teal-300 hover:shadow-emerald-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPaying
          ? "Awaiting HashPack signature…"
          : `Pay ${totalHbar} HBAR to Book Service`}
      </button>
    </div>
  );
}

function ProcessingView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="relative mb-6 h-16 w-16">
        <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10">
          <svg
            className="h-7 w-7 animate-spin text-emerald-400"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      </div>
      <p className="text-sm font-medium text-zinc-200">
        Processing via Hedera Testnet…
      </p>
      <p className="mt-2 text-xs text-zinc-500">
        Confirm the MPP transfer in HashPack if prompted.
      </p>
    </div>
  );
}

function SuccessView({
  service,
  platformFee,
  receipt,
  onReset,
}: {
  service: import("@/lib/mockServicesDb").ServiceListing;
  platformFee: number;
  receipt: HederaPaymentReceipt | null;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-500/15 shadow-lg shadow-emerald-500/20">
        <svg
          className="h-8 w-8 text-emerald-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <p className="text-base font-semibold text-emerald-300">
        Transaction Successful!
      </p>
      <p className="mt-2 max-w-[260px] text-sm leading-relaxed text-zinc-400">
        Your session with {service.providerName} is confirmed.
      </p>

      <ul className="mt-4 w-full max-w-[260px] space-y-1.5 rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-3 text-left text-xs text-zinc-400">
        <li className="flex justify-between gap-3">
          <span>Expert Settlement ({service.providerName})</span>
          <span className="shrink-0 font-mono text-emerald-400/90">
            {service.priceHbar} HBAR
          </span>
        </li>
        <li className="flex justify-between gap-3">
          <span>Platform Network Fee</span>
          <span className="font-mono text-emerald-400/90">
            {platformFee} HBAR
          </span>
        </li>
      </ul>

      {receipt?.transactionId && (
        <a
          href={getHashscanExplorerUrl(receipt)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 font-mono text-[10px] text-emerald-400/90 underline decoration-emerald-500/40 underline-offset-2 transition hover:text-emerald-300 hover:decoration-emerald-400"
        >
          View on HashScan
        </a>
      )}
      {receipt?.transactionId && (
        <p className="mt-2 break-all font-mono text-[10px] text-zinc-500">
          {receipt.transactionId}
        </p>
      )}
      <button
        type="button"
        onClick={onReset}
        className="mt-8 rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-500 transition hover:border-zinc-600 hover:text-zinc-300"
      >
        New session
      </button>
    </div>
  );
}
