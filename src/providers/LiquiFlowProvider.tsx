"use client";

/**
 * LiquiFlow app state — chat history and AP2 commerce panel.
 * Wallet connection is handled by WalletProvider (real HashPack / WC).
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const AP2_EXECUTION_FEE_HBAR = 10;

export const AI_PAYMENT_GATE_MESSAGE =
  "I have found the optimal routing for your request. To execute this cross-chain transaction via the Agentic Commerce Protocol (ACP), a network execution fee of 10 HBAR is required.";

export type CommercePanelState =
  | "idle"
  | "payment_required"
  | "processing"
  | "success";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface LiquiFlowContextValue {
  messages: ChatMessage[];
  isAiThinking: boolean;
  sendUserMessage: (text: string) => void;

  commerceState: CommercePanelState;
  commerceError: string | null;
  lastTransactionId: string | null;
  startPaymentProcessing: () => void;
  completePaymentSuccess: (transactionId: string) => void;
  failPayment: (message: string) => void;
  resetCommerce: () => void;
}

const LiquiFlowContext = createContext<LiquiFlowContextValue | null>(null);

let messageCounter = 0;
function nextId() {
  messageCounter += 1;
  return `msg-${messageCounter}-${Date.now()}`;
}

export function LiquiFlowProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);

  const [commerceState, setCommerceState] =
    useState<CommercePanelState>("idle");
  const [commerceError, setCommerceError] = useState<string | null>(null);
  const [lastTransactionId, setLastTransactionId] = useState<string | null>(
    null,
  );

  const sendUserMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isAiThinking) return;

    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: "user", content: trimmed },
    ]);
    setIsAiThinking(true);
    setCommerceError(null);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "assistant", content: AI_PAYMENT_GATE_MESSAGE },
      ]);
      setIsAiThinking(false);
      setCommerceState("payment_required");
    }, 1500);
  }, [isAiThinking]);

  const startPaymentProcessing = useCallback(() => {
    setCommerceError(null);
    setCommerceState("processing");
  }, []);

  const completePaymentSuccess = useCallback((transactionId: string) => {
    setLastTransactionId(transactionId);
    setCommerceState("success");
    setMessages((prev) => [
      ...prev,
      {
        id: nextId(),
        role: "assistant",
        content: `Transaction Successful! Tokens swapped and routed to Merchant.\n\nHedera Tx ID: ${transactionId}`,
      },
    ]);
  }, []);

  const failPayment = useCallback((message: string) => {
    setCommerceError(message);
    setCommerceState("payment_required");
  }, []);

  const resetCommerce = useCallback(() => {
    setCommerceState("idle");
    setCommerceError(null);
    setLastTransactionId(null);
  }, []);

  const value = useMemo<LiquiFlowContextValue>(
    () => ({
      messages,
      isAiThinking,
      sendUserMessage,
      commerceState,
      commerceError,
      lastTransactionId,
      startPaymentProcessing,
      completePaymentSuccess,
      failPayment,
      resetCommerce,
    }),
    [
      messages,
      isAiThinking,
      sendUserMessage,
      commerceState,
      commerceError,
      lastTransactionId,
      startPaymentProcessing,
      completePaymentSuccess,
      failPayment,
      resetCommerce,
    ],
  );

  return (
    <LiquiFlowContext.Provider value={value}>
      {children}
    </LiquiFlowContext.Provider>
  );
}

export function useLiquiFlow(): LiquiFlowContextValue {
  const ctx = useContext(LiquiFlowContext);
  if (!ctx) {
    throw new Error("useLiquiFlow must be used within LiquiFlowProvider");
  }
  return ctx;
}
