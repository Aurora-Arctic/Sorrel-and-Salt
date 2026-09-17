import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // MB.23: `make docker-codegen` drives a real browser inside the compose
  // network, so it loads the dev server as `http://sorrel-app:8000` rather
  // than `localhost`. Next's dev server 403s cross-origin requests to
  // `/_next/*` — including the HMR websocket upgrade — for every host outside
  // `localhost`, and under Turbopack a rejected HMR socket means the client
  // runtime never boots: the page renders its SSR HTML, then silently never
  // hydrates, so nothing interactive responds. Dev-only (server/lib/
  // router-server.js gates it on `development`), so `next start` — which is
  // what the e2e suite hits on 8001 — is unaffected either way.
  allowedDevOrigins: ['sorrel-app'],
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
