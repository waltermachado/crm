import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = async (phase: string): Promise<NextConfig> => {
  if (phase === "phase-development-server") {
    const { initOpenNextCloudflareForDev } = await import("@opennextjs/cloudflare");
    initOpenNextCloudflareForDev();
  }

  return {
    outputFileTracingRoot: __dirname,
    reactStrictMode: true,
    typedRoutes: true,
  };
};

export default nextConfig;