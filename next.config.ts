import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "bindings"],
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
  output: "standalone",
  webpack: (config, { nextRuntime, isServer }) => {
    if (nextRuntime === "edge" || !isServer) {
      config.resolve = config.resolve ?? {};
      config.resolve.fallback = {
        ...(config.resolve.fallback ?? {}),
        fs: false,
        path: false,
        os: false,
        crypto: false,
        "better-sqlite3": false,
        bindings: false,
      };
    }
    return config;
  },
};

export default config;
