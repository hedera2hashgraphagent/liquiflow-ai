"use client";

/**
 * WalletConnect / HashPack integration via @hashgraph/hedera-wallet-connect.
 *
 * Uses DAppConnector (WalletConnect modal) for Hedera Testnet.
 * PaymentCard calls `executeMPPPayment` to sign an MPP TransferTransaction.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DAppConnector,
  HederaChainId,
  HederaJsonRpcMethod,
  HederaSessionEvent,
} from "@hashgraph/hedera-wallet-connect";
import { AccountId, LedgerId } from "@hiero-ledger/sdk";
import type { AP2PaymentRequest } from "@/lib/ap2";
import { buildMPPTransferTransaction } from "@/lib/mpp";

const PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "YOUR_WALLETCONNECT_PROJECT_ID";

const DAPP_METADATA = {
  name: "LiquiFlow AI",
  description: "Hedera Commerce Agent — AP2 / MPP DeFi execution",
  url: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
  icons: ["https://avatars.githubusercontent.com/u/31002956"],
};

export interface WalletContextValue {
  accountId: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isInitialized: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  /** Signs & executes MPP TransferTransaction via HashPack / WalletConnect */
  executeMPPPayment: (payment: AP2PaymentRequest) => Promise<string>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const connectorRef = useRef<DAppConnector | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initWallet() {
      try {
        const connector = new DAppConnector(
          DAPP_METADATA,
          LedgerId.TESTNET,
          PROJECT_ID,
          Object.values(HederaJsonRpcMethod),
          [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
          [HederaChainId.Testnet],
        );

        await connector.init({ logger: "error" });
        if (cancelled) return;

        connectorRef.current = connector;

        // Restore session if user already paired HashPack
        if (connector.signers.length > 0) {
          setAccountId(connector.signers[0].getAccountId().toString());
        }

        setIsInitialized(true);
      } catch (error) {
        console.error("[WalletProvider] init failed:", error);
        setIsInitialized(true);
      }
    }

    initWallet();
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async () => {
    const connector = connectorRef.current;
    if (!connector) {
      throw new Error("WalletConnect not initialized. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.");
    }

    setIsConnecting(true);
    try {
      await connector.openModal();
      const signer = connector.signers[0];
      if (signer) {
        setAccountId(signer.getAccountId().toString());
      }
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    const connector = connectorRef.current;
    if (connector?.signers[0]) {
      await connector.disconnect(connector.signers[0].topic);
    }
    setAccountId(null);
  }, []);

  /**
   * MPP — Multi-Party Payment execution.
   * Single TransferTransaction atomically splits HBAR to multiple recipients.
   */
  const executeMPPPayment = useCallback(
    async (payment: AP2PaymentRequest): Promise<string> => {
      const connector = connectorRef.current;
      if (!connector || !accountId) {
        throw new Error("Connect HashPack or a WalletConnect wallet first.");
      }

      const transaction = buildMPPTransferTransaction({
        payerAccountId: accountId,
        payment,
      });

      const signer = connector.getSigner(AccountId.fromString(accountId));
      await transaction.freezeWithSigner(signer);

      // Preferred path: SDK Signer interface via WalletConnect
      const response = await transaction.executeWithSigner(signer);
      return response.transactionId.toString();
    },
    [accountId],
  );

  const value = useMemo<WalletContextValue>(
    () => ({
      accountId,
      isConnected: Boolean(accountId),
      isConnecting,
      isInitialized,
      connect,
      disconnect,
      executeMPPPayment,
    }),
    [accountId, isConnecting, isInitialized, connect, disconnect, executeMPPPayment],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return ctx;
}
