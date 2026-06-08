"use client";

import { useWallet } from "@/providers/WalletProvider";

/** Header control — opens HashPack / WalletConnect modal on Hedera Testnet. */
export function WalletButton() {
  const { accountId, isConnected, isConnecting, isInitialized, connect, disconnect } =
    useWallet();

  if (!isInitialized) {
    return (
      <button
        type="button"
        disabled
        className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-500"
      >
        Initializing wallet…
      </button>
    );
  }

  if (isConnected && accountId) {
    return (
      <div className="flex items-center gap-3">
        <span className="hidden font-mono text-xs text-emerald-400 sm:inline">
          {accountId}
        </span>
        <button
          type="button"
          onClick={() => disconnect()}
          className="rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-red-500/50 hover:bg-red-950/40"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => connect()}
      disabled={isConnecting}
      className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:from-emerald-500 hover:to-teal-400 disabled:opacity-60"
    >
      {isConnecting ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}
