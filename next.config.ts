// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { NextConfig } from "next";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nextConfig: any = {
  serverExternalPackages: [
    "@hashgraph/sdk",
    "@hiero-ledger/sdk"
  ],
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;