import { Chat } from "@/components/Chat";
import { WalletButton } from "@/components/WalletButton";

/**
 * LiquiFlow AI — main shell.
 * Dark-themed chat + WalletConnect header for Hedera Testnet.
 */
export default function Home() {
  return (
    <div className="flex h-dvh flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-black text-zinc-950">
            L
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight sm:text-lg">
              LiquiFlow AI
            </h1>
            <p className="text-[10px] text-zinc-500 sm:text-xs">
              AP2 · MPP · Hedera Testnet
            </p>
          </div>
        </div>
        <WalletButton />
      </header>

      {/* Chat */}
      <Chat />
    </div>
  );
}
