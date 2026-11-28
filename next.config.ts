import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/api/vsme/vs2026/report/snapshot/[snapshotId]": ["./assets/fonts/**/*"],
  },
};

export default nextConfig;
