import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["permissionless", "@rhinestone/module-sdk"],
};

export default nextConfig;
