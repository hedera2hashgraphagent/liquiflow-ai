/**
 * Normalizes WalletConnect / HashPack errors into user-facing messages.
 */

export function parseWalletError(error: unknown): string {
  if (!error) {
    return "An unknown wallet error occurred.";
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Transaction failed.";

  const lower = message.toLowerCase();

  if (
    lower.includes("user rejected") ||
    lower.includes("user disapproved") ||
    lower.includes("rejected the request") ||
    lower.includes("cancelled") ||
    lower.includes("canceled") ||
    lower.includes("declined")
  ) {
    return "Transaction rejected in HashPack. No HBAR was transferred.";
  }

  if (lower.includes("insufficient") || lower.includes("insufficient_payer_balance")) {
    return "Insufficient HBAR balance to cover the 10 ℏ execution fee.";
  }

  if (lower.includes("invalid account") || lower.includes("account_id")) {
    return "Invalid Hedera account. Reconnect HashPack and try again.";
  }

  if (lower.includes("session") && lower.includes("disconnect")) {
    return "Wallet session expired. Please reconnect HashPack.";
  }

  if (lower.includes("walletconnect") || lower.includes("project id")) {
    return "WalletConnect configuration error. Check NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.";
  }

  return message;
}
