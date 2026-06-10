"use client";

import { useEffect, useRef, useState } from "react";
import { getHashscanExplorerUrl } from "@/lib/hashscan";
import { useLiquiFlow } from "@/providers/LiquiFlowProvider";

const WELCOME_MESSAGE =
  "Welcome to LiquiFlow! I am your AI Agent for Web3 and Intellectual Services. Tell me what kind of expert you need, and I will find the most affordable option, match you, and handle the Hedera multi-party payment automatically.";

const QUICK_PROMPTS = [
  "Find me a Web3 Consultant",
  "I need a Smart Contract Audit",
  "Search for Psychological Support",
] as const;

/** Renders assistant text with basic **bold** markers. */
function ChatMessageContent({ content }: { content: string }) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);

  return (
    <p className="whitespace-pre-wrap">
      {parts.map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={index} className="font-semibold text-emerald-300">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </p>
  );
}

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
          <div className="mx-auto max-w-xl rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/80 to-zinc-950/50 p-6 text-center shadow-inner shadow-black/20 transition-opacity duration-500">
            <p className="text-lg font-semibold tracking-tight text-zinc-100">
              LiquiFlow AI
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-widest text-emerald-500/70">
              Decentralized Services Marketplace
            </p>
            <p className="mt-4 text-left text-sm leading-relaxed text-zinc-400">
              {WELCOME_MESSAGE}
            </p>
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
                  LiquiFlow Matchmaker
                </p>
              )}
              {msg.role === "assistant" ? (
                <ChatMessageContent content={msg.content} />
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
              {msg.transactionId && (
                <>
                  <a
                    href={getHashscanExplorerUrl({
                      transactionId: msg.transactionId,
                      consensusTimestamp: msg.consensusTimestamp ?? null,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block font-mono text-xs text-emerald-400/90 underline decoration-emerald-500/40 underline-offset-2 transition hover:text-emerald-300 hover:decoration-emerald-400"
                  >
                    View on HashScan
                  </a>
                  <p className="mt-1 break-all font-mono text-[10px] text-zinc-500">
                    {msg.transactionId}
                  </p>
                </>
              )}
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
            Scanning providers…
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-zinc-800 bg-zinc-950/80 p-4 backdrop-blur"
      >
        {messages.length === 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendUserMessage(prompt)}
                disabled={isAiThinking}
                className="rounded-full border border-zinc-700/80 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-300 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe the service or expert you are looking for..."
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
