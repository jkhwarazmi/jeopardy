import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only: allow phones/laptop on the LAN to load /_next dev resources
  // when accessing the dev server via its network IP (Next 16 blocks
  // cross-origin dev asset requests by default). No effect on production.
  allowedDevOrigins: ["192.168.1.*"],
};

export default nextConfig;
