/**
 * Hedera WalletConnect constants as plain strings.
 *
 * Avoid importing HederaJsonRpcMethod / HederaChainId enums from
 * @hashgraph/hedera-wallet-connect in client bundles — Turbopack can
 * tree-shake them to undefined, causing Object.values(null) crashes.
 */

/** HIP-820 Hedera Testnet CAIP chain id */
export const HEDERA_TESTNET_CHAIN = "hedera:testnet";

/** All Hedera JSON-RPC methods supported by DAppConnector */
export const HEDERA_JSON_RPC_METHODS = [
  "hedera_getNodeAddresses",
  "hedera_executeTransaction",
  "hedera_signMessage",
  "hedera_signAndExecuteQuery",
  "hedera_signAndExecuteTransaction",
  "hedera_signTransaction",
] as const;

/** Session events for account / network changes */
export const HEDERA_SESSION_EVENTS = ["chainChanged", "accountsChanged"] as const;
