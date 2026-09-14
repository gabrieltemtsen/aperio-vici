import type { NextConfig } from "next";

const convexHost = process.env.NEXT_PUBLIC_CONVEX_URL
  ? new URL(process.env.NEXT_PUBLIC_CONVEX_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...(convexHost
        ? [{ protocol: "https" as const, hostname: convexHost.replace(".cloud", ".site") }]
        : []),
      { protocol: "https", hostname: "**.convex.cloud" },
      { protocol: "https", hostname: "**.convex.site" },
    ],
  },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
