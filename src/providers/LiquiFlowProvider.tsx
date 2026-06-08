"use client";

/**
 * LiquiFlow hackathon demo state — wallet connection + AP2 commerce gate.
 * Simulates HashPack connect and Hedera Testnet payment for the demo flow.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const MOCK_HASHPACK_ACCOUNT = "0.0.123456";
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
  // Wallet (simulated HashPack)
  isWalletConnected: boolean;
  isWalletConnecting: boolean;
  accountId: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;

  // Chat
  messages: ChatMessage[];
  isAiThinking: boolean;
  sendUserMessage: (text: string) => void;

  // Commerce / AP2 gate
  commerceState: CommercePanelState;
  commerceError: string | null;
  payExecutionFee: () => void;
  resetCommerce: () => void;
}

const LiquiFlowContext = createContext<LiquiFlowContextValue | null>(null);

let messageCounter = 0;
function nextId() {
  messageCounter += 1;
  return `msg-${messageCounter}-${Date.now()}`;
}

export function LiquiFlowProvider({ children }: { children: ReactNode }) {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);

  const [commerceState, setCommerceState] =
    useState<CommercePanelState>("idle");
  const [commerceError, setCommerceError] = useState<string | null>(null);

  const connectWallet = useCallback(async () => {
    setIsWalletConnecting(true);
    // Simulate HashPack pairing delay
    await new Promise((r) => setTimeout(r, 800));
    setIsWalletConnected(true);
    setAccountId(MOCK_HASHPACK_ACCOUNT);
    setIsWalletConnecting(false);
  }, []);

  const disconnectWallet = useCallback(() => {
    setIsWalletConnected(false);
    setAccountId(null);
  }, []);

  const sendUserMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isAiThinking) return;

    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: "user", content: trimmed },
    ]);
    setIsAiThinking(true);
    setCommerceError(null);

    // Mock AI: think 1.5s, then reply and open AP2 payment gate
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "assistant", content: AI_PAYMENT_GATE_MESSAGE },
      ]);
      setIsAiThinking(false);
      setCommerceState("payment_required");
    }, 1500);
  }, [isAiThinking]);

  const payExecutionFee = useCallback(() => {
    setCommerceError(null);

    if (!isWalletConnected) {
      setCommerceError("Please connect your wallet first.");
      return;
    }

    setCommerceState("processing");

    setTimeout(() => {
      setCommerceState("success");
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          content:
            "Transaction Successful! Tokens swapped and routed to Merchant.",
        },
      ]);
    }, 2000);
  }, [isWalletConnected]);

  const resetCommerce = useCallback(() => {
    setCommerceState("idle");
    setCommerceError(null);
  }, []);

  const value = useMemo<LiquiFlowContextValue>(
    () => ({
      isWalletConnected,
      isWalletConnecting,
      accountId,
      connectWallet,
      disconnectWallet,
      messages,
      isAiThinking,
      sendUserMessage,
      commerceState,
      commerceError,
      payExecutionFee,
      resetCommerce,
    }),
    [
      isWalletConnected,
      isWalletConnecting,
      accountId,
      connectWallet,
      disconnectWallet,
      messages,
      isAiThinking,
      sendUserMessage,
      commerceState,
      commerceError,
      payExecutionFee,
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
