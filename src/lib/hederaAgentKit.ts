/**
 * Hedera Agent Kit — LangChain toolkit bridge for Vercel AI SDK.
 *
 * Initializes HederaLangchainToolkit with the same operator client as
 * hederaService, then adapts LangChain StructuredTools for streamText.
 */

import { AgentMode } from "@hashgraph/hedera-agent-kit";
import { HederaLangchainToolkit } from "@hashgraph/hedera-agent-kit-langchain";
import { allCorePlugins } from "@hashgraph/hedera-agent-kit/plugins";
import type { Client } from "@hiero-ledger/sdk";
import { dynamicTool, type Tool } from "ai";
import { createTestnetClient } from "./hederaService";

/** Minimal shape returned by HederaLangchainToolkit.getTools(). */
type HederaLangchainTool = {
  name: string;
  description: string;
  schema: Parameters<typeof dynamicTool>[0]["inputSchema"];
  invoke: (input: unknown) => Promise<unknown>;
};

let cachedToolkit: HederaLangchainToolkit | null | undefined;

/** Reuses the server operator client (HEDERA_OPERATOR_ID / PRIVATE_KEY). */
export function createHederaLangchainToolkit(): HederaLangchainToolkit {
  const client = createTestnetClient() as unknown as Client;

  return new HederaLangchainToolkit({
    client,
    configuration: {
      tools: [],
      plugins: allCorePlugins,
      context: { mode: AgentMode.AUTONOMOUS },
    },
  });
}

/** Lazy singleton so the chat route does not re-discover plugins on every request. */
export function getHederaLangchainToolkit(): HederaLangchainToolkit | null {
  if (cachedToolkit !== undefined) {
    return cachedToolkit;
  }

  try {
    cachedToolkit = createHederaLangchainToolkit();
  } catch (error) {
    console.warn(
      "[LiquiFlow] Hedera Agent Kit unavailable — continuing with AP2/MPP tools only.",
      error,
    );
    cachedToolkit = null;
  }

  return cachedToolkit;
}

/** Hedera Agent Kit tools adapted for Vercel AI SDK streamText. */
export function getHederaAISDKTools(): Record<string, Tool> {
  const toolkit = getHederaLangchainToolkit();
  if (!toolkit) return {};

  return hederaLangchainToolsToAISDK(
    // @ts-ignore
    toolkit.getTools() as any,
  );
}

/** Adapts LangChain HederaAgentKitTool instances to Vercel AI SDK Tool records. */
export function hederaLangchainToolsToAISDK(
  langchainTools: HederaLangchainTool[],
): Record<string, Tool> {
  const tools: Record<string, Tool> = {};

  for (const hakTool of langchainTools) {
    tools[hakTool.name] = dynamicTool({
      description: hakTool.description,
      inputSchema: hakTool.schema,
      execute: async (input) => hakTool.invoke(input),
    });
  }

  return tools;
}
