"use client";

/**
 * LiquiFlow chat — Vercel AI SDK useChat with AP2 tool interception.
 *
 * When the agent calls `requestAP2Payment`, we render PaymentCard instead of
 * raw JSON. After MPP payment, we inject the transaction ID back into the chat
 * so the agent can call `executeSwap`.
 */

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useMemo, useState } from "react";
import { isAP2PaymentRequest, type AP2PaymentRequest } from "@/lib/ap2";
import { PaymentCard } from "./PaymentCard";

const SUGGESTED_PROMPT =
  "Analyze the market and swap 100 HBAR for LUMA token";

export function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isBusy = status === "submitted" || status === "streaming";

  /** After MPP payment, notify the agent with a structured receipt message. */
  function handlePaymentSuccess(transactionId: string) {
    sendMessage({
      text: `[AP2_PAYMENT_CONFIRMED] transaction_id=${transactionId}. Premium execution fee paid via MPP. Proceed with the swap.`,
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Message list */}
      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6 sm:px-6">
        {messages.length === 0 && (
          <div className="mx-auto max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
            <p className="text-lg font-medium text-zinc-200">
              Hedera Commerce Agent
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              AP2 gates premium DeFi execution. MPP splits fees across treasury
              accounts on Hedera Testnet.
            </p>
            <button
              type="button"
              onClick={() => sendMessage({ text: SUGGESTED_PROMPT })}
              className="mt-4 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-emerald-400 transition hover:border-emerald-500/50 hover:bg-emerald-500/10"
            >
              Try: &quot;{SUGGESTED_PROMPT}&quot;
            </button>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            role={message.role}
            parts={message.parts}
            onPaymentSuccess={handlePaymentSuccess}
          />
        ))}

        {isBusy && (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            LiquiFlow is thinking…
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim() || isBusy) return;
          sendMessage({ text: input });
          setInput("");
        }}
        className="border-t border-zinc-800 bg-zinc-950/80 p-4 backdrop-blur"
      >
        <div className="mx-auto flex max-w-3xl gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask LiquiFlow to analyze and execute a swap…"
            disabled={isBusy}
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isBusy || !input.trim()}
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

/** UI message part — tool parts use `tool-${toolName}` types in AI SDK 5+. */
interface UIPart {
  type: string;
  text?: string;
  state?: string;
  output?: unknown;
  input?: unknown;
  errorText?: string;
}

interface MessageBubbleProps {
  role: string;
  parts: UIPart[];
  onPaymentSuccess: (txId: string) => void;
}

function MessageBubble({ role, parts, onPaymentSuccess }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[90%] sm:max-w-[75%] ${
          isUser
            ? "rounded-2xl rounded-br-md bg-emerald-600/20 px-4 py-3 text-zinc-100"
            : "w-full max-w-2xl"
        }`}
      >
        {!isUser && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-500/80">
            LiquiFlow AI
          </p>
        )}

        {parts.map((part, index) => (
          <PartRenderer
            key={`${part.type}-${index}`}
            part={part}
            onPaymentSuccess={onPaymentSuccess}
          />
        ))}
      </div>
    </div>
  );
}

function PartRenderer({
  part,
  onPaymentSuccess,
}: {
  part: UIPart;
  onPaymentSuccess: (txId: string) => void;
}) {
  // Plain text chunks
  if (part.type === "text" && part.text) {
    return (
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
        {part.text}
      </p>
    );
  }

  // AP2 interception — tool-requestAP2Payment (AI SDK 5+ naming)
  if (part.type === "tool-requestAP2Payment") {
    return (
      <AP2ToolPart part={part} onPaymentSuccess={onPaymentSuccess} />
    );
  }

  // Other tools — compact status line
  if (part.type?.startsWith("tool-")) {
    const toolName = part.type.replace("tool-", "");
    if (part.state === "output-available" && part.output) {
      return (
        <details className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-2">
          <summary className="cursor-pointer text-xs text-zinc-500">
            Tool: {toolName} ✓
          </summary>
          <pre className="mt-1 overflow-x-auto text-[10px] text-zinc-600">
            {JSON.stringify(part.output, null, 2)}
          </pre>
        </details>
      );
    }
    if (part.state === "input-available" || part.state === "input-streaming") {
      return (
        <p className="text-xs text-zinc-500">Running {toolName}…</p>
      );
    }
  }

  return null;
}

/** Extracts AP2 payload from requestAP2Payment tool part and renders PaymentCard. */
function AP2ToolPart({
  part,
  onPaymentSuccess,
}: {
  part: UIPart;
  onPaymentSuccess: (txId: string) => void;
}) {
  const payment = useMemo((): AP2PaymentRequest | null => {
    const candidate = part.output ?? part.input;
    if (isAP2PaymentRequest(candidate)) return candidate;
    return null;
  }, [part.output, part.input]);

  if (part.state === "input-streaming" || part.state === "input-available") {
    return (
      <p className="text-sm text-zinc-400">Preparing AP2 payment request…</p>
    );
  }

  if (part.state === "output-error") {
    return (
      <p className="text-sm text-red-400">
        AP2 request failed: {part.errorText ?? "Unknown error"}
      </p>
    );
  }

  if (!payment) {
    return (
      <p className="text-sm text-amber-400">Invalid AP2 payment payload.</p>
    );
  }

  return <PaymentCard payment={payment} onPaymentSuccess={onPaymentSuccess} />;
}
