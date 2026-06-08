import { ChatWindow } from "@/components/ChatWindow";
import { CommercePanel } from "@/components/CommercePanel";
import { WalletButton } from "@/components/WalletButton";

/**
 * LiquiFlow AI — hackathon demo shell.
 * Left: chat agent · Right: AP2 commerce payment gate
 */
export default function Home() {
  return (
    <div className="flex h-dvh flex-col bg-zinc-950 text-zinc-100">
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

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ChatWindow />
        </section>
        <CommercePanel />
      </main>
    </div>
  );
}
