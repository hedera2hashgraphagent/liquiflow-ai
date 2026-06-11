import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@hashgraph/sdk",
    "@hiero-ledger/sdk",
    "@hashgraph/hedera-agent-kit",
    "@hashgraph/hedera-agent-kit-langchain",
    "@langchain/core",
    "@langchain/mcp-adapters",
    "@langchain/langgraph",
    "langchain",
  ],
};

export default nextConfig;
