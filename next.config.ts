import type { NextConfig } from "next";

// For GitHub Pages project sites, set NEXT_PUBLIC_BASE_PATH to "/<repo-name>".
// For user/organisation root sites (username.github.io) leave it empty.
// The deploy workflow sets this automatically based on the repository name.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  // Static export so it can be hosted on GitHub Pages (no server needed).
  output: "export",
  // Serve pretty URLs (each route as a folder with index.html).
  trailingSlash: true,
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: ["*.space-z.ai", "*.z.ai", "localhost", "127.0.0.1"],
};

export default nextConfig;
