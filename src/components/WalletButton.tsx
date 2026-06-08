"use client";

import { useWallet } from "@/providers/WalletProvider";

/** Header control — opens HashPack / WalletConnect modal on Hedera Testnet. */
export function WalletButton() {
  const {
    accountId,
    isConnected,
    isConnecting,
    walletError,
    connect,
    disconnect,
  } = useWallet();

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
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => connect()}
        disabled={isConnecting}
        className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:from-emerald-500 hover:to-teal-400 disabled:opacity-60"
      >
        {isConnecting ? "Connecting…" : "Connect Wallet"}
      </button>
      {walletError && (
        <span className="max-w-[220px] text-right text-[10px] text-amber-400">
          {walletError}
        </span>
      )}
    </div>
  );
}
