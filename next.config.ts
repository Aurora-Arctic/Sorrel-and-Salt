import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // `make docker-codegen` drives a real browser inside the compose network,
  // loading the dev server as `http://sorrel-app:8000`. Next's dev server
  // 403s cross-origin `/_next/*` requests — the HMR websocket upgrade
  // included — for every host but `localhost`, and under Turbopack a rejected
  // HMR socket means the client runtime never boots: the page renders its SSR
  // HTML and then silently never hydrates. Dev-only, so `next start` (what
  // e2e hits on 8001) is unaffected.
  allowedDevOrigins: ['sorrel-app'],
  // `next dev` (8000) and the e2e webServer's `next build && next start`
  // (8001) run at once and would otherwise share the default `.next/` — a
  // concurrent dev rebuild can corrupt the production build e2e is serving
  // from. playwright.config.ts points its webServer elsewhere; dev keeps the
  // default.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  // Without this the e2e build ships no .js.map files, and
  // monocart-coverage-reports can only attribute V8 coverage to minified
  // chunk names. `next dev` never reads the flag, so it costs nothing else.
  productionBrowserSourceMaps: true,
};

export default nextConfig;
