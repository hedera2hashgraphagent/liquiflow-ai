import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@hashgraph/sdk", "@hiero-ledger/sdk"],
  turbopack: {},
};

export default nextConfig;
