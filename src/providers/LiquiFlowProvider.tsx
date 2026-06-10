"use client";

/**
 * LiquiFlow app state — chat history and AP2 commerce panel.
 * Wallet connection is handled by WalletProvider (real HashPack / WC).
 */

import type { AP2PaymentRequest } from "@/lib/ap2";
import { createMarketplacePaymentRequest } from "@/lib/ap2";
import type { HederaPaymentReceipt } from "@/lib/hedera-constants";
import {
  buildMatchmakingReply,
  calculateMarketplaceTotal,
  extractCategoryIntent,
  findCheapestService,
  MARKETPLACE_CATEGORIES,
  PLATFORM_NETWORK_FEE_HBAR,
  type ServiceListing,
} from "@/lib/mockServicesDb";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CommercePanelState =
  | "idle"
  | "payment_required"
  | "processing"
  | "success";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Set on successful payment — rendered as a HashScan link in chat. */
  transactionId?: string;
  consensusTimestamp?: string | null;
}

interface LiquiFlowContextValue {
  messages: ChatMessage[];
  isAiThinking: boolean;
  sendUserMessage: (text: string) => void;

  commerceState: CommercePanelState;
  commerceError: string | null;
  lastPaymentReceipt: HederaPaymentReceipt | null;
  selectedService: ServiceListing | null;
  paymentRequest: AP2PaymentRequest | null;
  platformNetworkFeeHbar: number;
  paymentTotalHbar: number;

  startPaymentProcessing: () => void;
  completePaymentSuccess: (receipt: HederaPaymentReceipt) => void;
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
  const [lastPaymentReceipt, setLastPaymentReceipt] =
    useState<HederaPaymentReceipt | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceListing | null>(
    null,
  );
  const [paymentRequest, setPaymentRequest] =
    useState<AP2PaymentRequest | null>(null);

  const paymentTotalHbar = selectedService
    ? calculateMarketplaceTotal(selectedService.priceHbar)
    : 0;

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
      const category = extractCategoryIntent(trimmed);

      if (!category) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            content:
              `I couldn't determine which intellectual service you need. ` +
              `Try asking for one of: ${MARKETPLACE_CATEGORIES.join(", ")}.`,
          },
        ]);
        setIsAiThinking(false);
        return;
      }

      const cheapest = findCheapestService(category);

      if (!cheapest) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            content: `No providers are listed for '${category}' right now. Please try another category.`,
          },
        ]);
        setIsAiThinking(false);
        return;
      }

      const request = createMarketplacePaymentRequest(cheapest);

      setSelectedService(cheapest);
      setPaymentRequest(request);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          content: buildMatchmakingReply(category, cheapest),
        },
      ]);
      setIsAiThinking(false);
      setCommerceState("payment_required");
    }, 1500);
  }, [isAiThinking]);

  const startPaymentProcessing = useCallback(() => {
    setCommerceError(null);
    setCommerceState("processing");
  }, []);

  const completePaymentSuccess = useCallback(
    (receipt: HederaPaymentReceipt) => {
      setLastPaymentReceipt(receipt);
      setCommerceState("success");

      const providerName = selectedService?.providerName ?? "Expert";
      const servicePrice = selectedService?.priceHbar ?? 0;

      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          content:
            `Service booking confirmed! Your session with ${providerName} is secured on-ledger.\n\n` +
            `Expert Settlement (${providerName}): ${servicePrice} HBAR\n` +
            `Matchmaking Network Fee: ${PLATFORM_NETWORK_FEE_HBAR} HBAR`,
          transactionId: receipt.transactionId,
          consensusTimestamp: receipt.consensusTimestamp,
        },
      ]);
    },
    [selectedService],
  );

  const failPayment = useCallback((message: string) => {
    setCommerceError(message);
    setCommerceState("payment_required");
  }, []);

  const resetCommerce = useCallback(() => {
    setCommerceState("idle");
    setCommerceError(null);
    setLastPaymentReceipt(null);
    setSelectedService(null);
    setPaymentRequest(null);
  }, []);

  const value = useMemo<LiquiFlowContextValue>(
    () => ({
      messages,
      isAiThinking,
      sendUserMessage,
      commerceState,
      commerceError,
      lastPaymentReceipt,
      selectedService,
      paymentRequest,
      platformNetworkFeeHbar: PLATFORM_NETWORK_FEE_HBAR,
      paymentTotalHbar,
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
      lastPaymentReceipt,
      selectedService,
      paymentRequest,
      paymentTotalHbar,
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
