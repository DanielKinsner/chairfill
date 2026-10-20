import type { NextConfig } from "next";

// Pin the project root: a stray package-lock.json higher up the disk otherwise
// makes Next guess the wrong workspace.
const root = process.cwd();

const nextConfig: NextConfig = {
  outputFileTracingRoot: root,
  turbopack: { root },
};

export default nextConfig;
