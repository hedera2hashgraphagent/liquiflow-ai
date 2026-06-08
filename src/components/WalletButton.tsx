"use client";

import { useWallet } from "@/providers/WalletProvider";

/** Opens real HashPack pairing via WalletConnect on Hedera Testnet. */
export function WalletButton() {
  const {
    accountId,
    isConnected,
    isConnecting,
    isInitialized,
    walletError,
    connect,
    disconnect,
  } = useWallet();

  if (isConnected && accountId) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => disconnect()}
          className="wallet-connected-glow rounded-lg border border-emerald-500/60 bg-emerald-500/15 px-4 py-2 font-mono text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/25"
        >
          Connected: {accountId}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => connect()}
        disabled={isConnecting || !isInitialized}
        className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:from-emerald-500 hover:to-teal-400 disabled:opacity-60"
      >
        {isConnecting
          ? "Pairing HashPack…"
          : !isInitialized
            ? "Initializing…"
            : "Connect Wallet"}
      </button>
      {walletError && (
        <span className="max-w-[260px] text-right text-[10px] text-amber-400">
          {walletError}
        </span>
      )}
    </div>
  );
}
