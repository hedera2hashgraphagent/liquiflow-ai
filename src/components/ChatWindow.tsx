"use client";

import { useEffect, useRef, useState } from "react";
import { useLiquiFlow } from "@/providers/LiquiFlowProvider";

const SUGGESTED_PROMPT = "I want to buy the Premium DeFi Node";

export function ChatWindow() {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const { messages, isAiThinking, sendUserMessage } = useLiquiFlow();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAiThinking]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isAiThinking) return;
    sendUserMessage(input);
    setInput("");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-6">
        {messages.length === 0 && (
          <div className="mx-auto max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-center transition-opacity duration-500">
            <p className="text-lg font-medium text-zinc-200">
              Hedera Commerce Agent
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Ask for premium DeFi execution. The agent will route your request
              and gate settlement via AP2 on Hedera Testnet.
            </p>
            <button
              type="button"
              onClick={() => sendUserMessage(SUGGESTED_PROMPT)}
              disabled={isAiThinking}
              className="mt-4 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-emerald-400 transition hover:border-emerald-500/50 hover:bg-emerald-500/10 disabled:opacity-50"
            >
              Try: &quot;{SUGGESTED_PROMPT}&quot;
            </button>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex transition-all duration-300 ease-out ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "rounded-br-md bg-emerald-600/20 text-zinc-100"
                  : "rounded-bl-md border border-zinc-800 bg-zinc-900/80 text-zinc-200"
              }`}
            >
              {msg.role === "assistant" && (
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-500/80">
                  LiquiFlow AI
                </p>
              )}
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {isAiThinking && (
          <div className="flex items-center gap-2 text-sm text-zinc-500 animate-in fade-in duration-300">
            <span className="flex gap-1">
              <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:0ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:300ms]" />
            </span>
            LiquiFlow is thinking…
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-zinc-800 bg-zinc-950/80 p-4 backdrop-blur"
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your DeFi execution request…"
            disabled={isAiThinking}
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 transition focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isAiThinking || !input.trim()}
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
