// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { NextConfig } from "next";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nextConfig: any = {
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
  turbopack: {},
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;