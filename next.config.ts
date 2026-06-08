import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["chartjs-node-canvas", "canvas"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
