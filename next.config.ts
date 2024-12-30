// next.config.js
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ...other config options...

  images: {
    // Add "firebasestorage.googleapis.com" to the list of allowed domains
    domains: ["firebasestorage.googleapis.com"],
  },
};

export default nextConfig;
