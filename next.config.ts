import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // so phones on the local network can use the dev server
  allowedDevOrigins: ["192.168.1.*"],
};

export default nextConfig;
