import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = async (phase) => {
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
