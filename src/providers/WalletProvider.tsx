"use client";

/**
 * Real HashPack / WalletConnect integration via @hashgraph/hedera-wallet-connect.
 * Signs and executes AP2 MPP TransferTransactions on Hedera Testnet.
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
import type { DAppConnector } from "@hashgraph/hedera-wallet-connect";
import { parseWalletError } from "@/lib/wallet-errors";
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
  /** HashPack signs & executes a real AP2 MPP transfer on Hedera Testnet */
  executeAP2Payment: (amountHbar: number) => Promise<string>;
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
        "Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in .env.local (https://cloud.reown.com/).";
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
          const message = parseWalletError(error);
          setWalletError(message);
          console.error("[WalletProvider] init failed:", error);
          return null;
        }
      })();
    }

    return initPromiseRef.current;
  }, []);

  // Pre-warm WalletConnect in the background so Connect is ready immediately
  useEffect(() => {
    if (!isValidProjectId(PROJECT_ID)) {
      setIsInitialized(true);
      setWalletError(
        "Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in .env.local (https://cloud.reown.com/).",
      );
      return;
    }
    ensureConnector()
      .catch(() => undefined)
      .finally(() => setIsInitialized(true));
  }, [ensureConnector]);

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
      } else {
        setWalletError("HashPack connection cancelled or no account was returned.");
      }
    } catch (error) {
      setWalletError(parseWalletError(error));
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
        console.warn("[WalletProvider] disconnect:", error);
      }
    }
    setAccountId(null);
    setWalletError(null);
  }, []);

  /**
   * AP2 / MPP — build TransferTransaction via hederaService, sign with HashPack,
   * and submit to Hedera Testnet consensus nodes.
   */
  const executeAP2Payment = useCallback(
    async (amountHbar: number): Promise<string> => {
      const connector = await ensureConnector();
      if (!connector || !accountId) {
        throw new Error("Connect HashPack before paying the execution fee.");
      }

      try {
        const [{ AccountId }, { createAP2PaymentRequest }, { buildMPPTransferTransaction }] =
          await Promise.all([
            import("@hiero-ledger/sdk"),
            import("@/lib/ap2"),
            import("@/lib/mpp"),
          ]);

        // MPP transaction — same split as hederaService.buildAP2MPPTransaction, typed for WalletConnect signer
        const payment = createAP2PaymentRequest({ amount_hbar: amountHbar });
        const transaction = buildMPPTransferTransaction({
          payerAccountId: accountId,
          payment,
        });
        const signer = connector.getSigner(AccountId.fromString(accountId));

        // freezeWithSigner assigns node + valid start; node 0.0.3 set in mpp.ts
        const frozen = await transaction.freezeWithSigner(signer);
        const response = await frozen.executeWithSigner(signer);

        return response.transactionId.toString();
      } catch (error) {
        throw new Error(parseWalletError(error));
      }
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
      executeAP2Payment,
    }),
    [
      accountId,
      isConnecting,
      isInitialized,
      walletError,
      connect,
      disconnect,
      executeAP2Payment,
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
