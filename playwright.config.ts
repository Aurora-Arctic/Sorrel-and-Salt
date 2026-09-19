import { defineConfig, devices } from '@playwright/test';
import { e2eDatabaseUrl } from './e2e/database';

// Deliberately separate from the dev server's 8000 (CLAUDE.md's Commands
// table) so `npm run dev` and an e2e run can sit side by side.
const PORT = 8001;

// MB.22 — set only by `.devcontainer/docker-compose.yml`'s `devcontainer`
// service, never by an npm script or the one-shot `e2e` compose service. When
// present, the *browser* runs remotely in the `playwright-server` compose
// service (`ws://playwright-server:4444/` — a WebSocket for Playwright's own
// remote-browser protocol, not a page); the test *runner* still runs locally,
// and the `webServer` readiness check below always polls `localhost` because
// that check runs from the runner's process, not the browser's. Why the browser
// moves at all, and why the variable stays this narrowly scoped:
// claude-docs/debugging.md, "Test debugging".
const wsEndpoint = process.env.PLAYWRIGHT_WS_ENDPOINT;
const webServerUrl = `http://localhost:${PORT}`;
// A remote browser can't resolve the runner's `localhost`; `next start
// --hostname 0.0.0.0` (package.json's `start` script) already binds every
// interface, so the compose service name is reachable instead.
const baseURL = wsEndpoint ? `http://devcontainer:${PORT}` : webServerUrl;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL,
    // On CI, a retry is the cheap filter for flake, so a trace is worth
    // keeping only once something has already failed twice. Locally there
    // is no retry (`retries` above is 0 off CI), so the first failure has to
    // carry its own evidence — otherwise it produces nothing to look at.
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: process.env.CI ? 'off' : 'only-on-failure',
    video: process.env.CI ? 'off' : 'retain-on-failure',
    ...(wsEndpoint ? { connectOptions: { wsEndpoint } } : {}),
  },
  // Production build, not `next dev` — this is what catches what the
  // component suite can't. `sorrel_e2e` (not the dev database) is wired in
  // via DATABASE_URL so a smoke-spec failure never touches local dev data.
  webServer: {
    command: 'npm run build && npm run start',
    url: webServerUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      PORT: String(PORT),
      DATABASE_URL: e2eDatabaseUrl(),
      // Keeps the production build e2e serves out of `next dev`'s way — see
      // next.config.ts.
      NEXT_DIST_DIR: '.next-e2e',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
