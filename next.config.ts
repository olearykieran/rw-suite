// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Keep your existing images configuration
  images: {
    domains: ["firebasestorage.googleapis.com"],
    // Add Instagram and other domains that your images might come from
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // Configure webpack for handling node-fetch
  webpack: (config) => {
    // Configure webpack to handle node-fetch properly
    config.resolve.fallback = {
      ...config.resolve.fallback,
      net: false,
      dns: false,
      tls: false,
      fs: false,
      request: false,
    };

    return config;
  },
};

export default nextConfig;
