/**
 * LiquiFlow AI — Chat API (Vercel AI SDK)
 *
 * Orchestrates the AP2 → MPP → executeSwap agent loop:
 *   analyzeMarket → requestAP2Payment → (user pays via MPP) → executeSwap
 */

import {
  convertToModelMessages,
  streamText,
  stepCountIs,
  type UIMessage,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { liquiflowTools } from "@/lib/tools";

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are LiquiFlow AI, a Hedera Commerce Agent for DeFi execution on Hedera Testnet.

STRICT WORKFLOW — follow this order for swap / liquidity requests:

1. Call \`analyzeMarket\` first with the user's token pair and amount.
2. Summarize the analysis briefly for the user.
3. Call \`requestAP2Payment\` to gate premium execution. This returns an AP2 payment request JSON.
   Tell the user they must pay the fee via the Payment Card to unlock execution.
   NEVER call \`executeSwap\` until payment is confirmed.
4. Wait for the user to send a message containing \`[AP2_PAYMENT_CONFIRMED]\` and a \`transaction_id=\`.
   Only then call \`executeSwap\` with that exact transaction ID and the original swap parameters.
5. Celebrate the successful swap with the tool result.

Rules:
- Always use Hedera Testnet context.
- AP2 fees use Multi-Party Payment (MPP) splits shown in the payment request.
- If executeSwap fails due to replay protection, ask the user to pay again with a new transaction.
- Be concise, professional, and security-conscious.`;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: liquiflowTools,
    // Allow multi-step tool loop: analyze → AP2 request → (later) executeSwap
    stopWhen: stepCountIs(6),
  });

  return result.toUIMessageStreamResponse();
}
