"use client";

/**
 * WalletConnect / HashPack integration via @hashgraph/hedera-wallet-connect.
 *
 * Wallet libs are dynamically imported and initialized lazily on first connect
 * so the chat UI renders even when WalletConnect env vars are missing.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { DAppConnector } from "@hashgraph/hedera-wallet-connect";
import type { AP2PaymentRequest } from "@/lib/ap2";
import {
  HEDERA_JSON_RPC_METHODS,
  HEDERA_SESSION_EVENTS,
  HEDERA_TESTNET_CHAIN,
} from "@/lib/wallet-constants";

const PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ?? "";

const PLACEHOLDER_PROJECT_ID = "YOUR_WALLETCONNECT_PROJECT_ID";

const DAPP_METADATA = {
  name: "LiquiFlow AI",
  description: "Hedera Commerce Agent — AP2 / MPP DeFi execution",
  url:
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000",
  icons: ["https://avatars.githubusercontent.com/u/31002956"],
};

export interface WalletContextValue {
  accountId: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isInitialized: boolean;
  walletError: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  executeMPPPayment: (payment: AP2PaymentRequest) => Promise<string>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

function isValidProjectId(projectId: string): boolean {
  return (
    projectId.length > 0 &&
    projectId !== PLACEHOLDER_PROJECT_ID &&
    !projectId.startsWith("your_")
  );
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const connectorRef = useRef<DAppConnector | null>(null);
  const initPromiseRef = useRef<Promise<DAppConnector | null> | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const ensureConnector = useCallback(async (): Promise<DAppConnector | null> => {
    if (connectorRef.current) {
      return connectorRef.current;
    }

    if (!isValidProjectId(PROJECT_ID)) {
      const message =
        "Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in .env.local (get one at https://cloud.reown.com/).";
      setWalletError(message);
      throw new Error(message);
    }

    if (!initPromiseRef.current) {
      initPromiseRef.current = (async () => {
        try {
          const [{ DAppConnector }, { LedgerId }] = await Promise.all([
            import("@hashgraph/hedera-wallet-connect"),
            import("@hiero-ledger/sdk"),
          ]);

          const connector = new DAppConnector(
            DAPP_METADATA,
            LedgerId.TESTNET,
            PROJECT_ID,
            [...HEDERA_JSON_RPC_METHODS],
            [...HEDERA_SESSION_EVENTS],
            [HEDERA_TESTNET_CHAIN],
          );

          await connector.init({ logger: "error" });
          connectorRef.current = connector;

          if (connector.signers.length > 0) {
            setAccountId(connector.signers[0].getAccountId().toString());
          }

          setWalletError(null);
          return connector;
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "WalletConnect initialization failed.";
          setWalletError(message);
          console.error("[WalletProvider] init failed:", error);
          return null;
        } finally {
          setIsInitialized(true);
        }
      })();
    }

    return initPromiseRef.current;
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setWalletError(null);
    try {
      const connector = await ensureConnector();
      if (!connector) return;

      await connector.openModal();
      const signer = connector.signers[0];
      if (signer) {
        setAccountId(signer.getAccountId().toString());
      }
    } finally {
      setIsConnecting(false);
    }
  }, [ensureConnector]);

  const disconnect = useCallback(async () => {
    const connector = connectorRef.current;
    const signer = connector?.signers[0];
    if (connector && signer) {
      try {
        await connector.disconnect(signer.topic);
      } catch (error) {
        // Session may already be closed — still clear local state
        console.warn("[WalletProvider] disconnect:", error);
      }
    }
    setAccountId(null);
  }, []);

  const executeMPPPayment = useCallback(
    async (payment: AP2PaymentRequest): Promise<string> => {
      const connector = await ensureConnector();
      if (!connector || !accountId) {
        throw new Error("Connect HashPack or a WalletConnect wallet first.");
      }

      const [{ AccountId }, { buildMPPTransferTransaction }] = await Promise.all([
        import("@hiero-ledger/sdk"),
        import("@/lib/mpp"),
      ]);

      const transaction = buildMPPTransferTransaction({
        payerAccountId: accountId,
        payment,
      });

      const signer = connector.getSigner(AccountId.fromString(accountId));
      await transaction.freezeWithSigner(signer);
      const response = await transaction.executeWithSigner(signer);
      return response.transactionId.toString();
    },
    [accountId, ensureConnector],
  );

  const value = useMemo<WalletContextValue>(
    () => ({
      accountId,
      isConnected: Boolean(accountId),
      isConnecting,
      isInitialized,
      walletError,
      connect,
      disconnect,
      executeMPPPayment,
    }),
    [
      accountId,
      isConnecting,
      isInitialized,
      walletError,
      connect,
      disconnect,
      executeMPPPayment,
    ],
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
