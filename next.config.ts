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
  // Without this the e2e build ships no .js.map files, so
  // monocart-coverage-reports (e2e/coverage.config.ts) can only attribute
  // V8 coverage to minified chunk names — useless for troubleshooting a
  // failure. `next dev` never reads this flag, so it costs nothing outside
  // the e2e build.
  productionBrowserSourceMaps: true,
};

export default nextConfig;
