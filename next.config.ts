import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // `next dev` (8000) and the e2e `webServer`'s `next build && next start`
  // (8001) run at once (CLAUDE.md's Commands table) and would otherwise
  // both read/write the default `.next/` — a concurrent dev rebuild could
  // corrupt the production build e2e is serving from. playwright.config.ts
  // points its webServer at a separate directory; dev keeps the default.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
};

export default nextConfig;
