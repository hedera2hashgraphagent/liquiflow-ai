"use client";

import { useLiquiFlow } from "@/providers/LiquiFlowProvider";

/** Simulated HashPack connect — glows green when connected. */
export function WalletButton() {
  const {
    isWalletConnected,
    isWalletConnecting,
    accountId,
    connectWallet,
    disconnectWallet,
  } = useLiquiFlow();

  if (isWalletConnected && accountId) {
    return (
      <button
        type="button"
        onClick={disconnectWallet}
        className="wallet-connected-glow rounded-lg border border-emerald-500/60 bg-emerald-500/15 px-4 py-2 font-mono text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/25"
      >
        Connected: {accountId}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => connectWallet()}
      disabled={isWalletConnecting}
      className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:from-emerald-500 hover:to-teal-400 disabled:opacity-60"
    >
      {isWalletConnecting ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}
