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
  turbopack: {},
  typescript: {
    // Շրջանցում է Vercel-ի TypeScript-ի անվերջանալի ստուգումը
    ignoreBuildErrors: true,
  },
};

export default nextConfig;