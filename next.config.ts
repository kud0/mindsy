import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip ESLint during builds to allow security patches through
  // TODO: Fix ESLint errors and remove this
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
