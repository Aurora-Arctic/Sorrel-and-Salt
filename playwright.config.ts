import { defineConfig, devices } from '@playwright/test';
import { e2eDatabaseUrl } from './e2e/database';

// Not the dev server's 8000, so `npm run dev` and an e2e run can sit side by side.
const PORT = 8001;

// Set only by the `devcontainer` compose service: the browser then runs in
// the `playwright-server` service while the runner stays local, which is why
// `webServer`'s readiness poll stays on `localhost`. claude-docs/testing.md,
// "E2E".
const wsEndpoint = process.env.PLAYWRIGHT_WS_ENDPOINT;
const webServerUrl = `http://localhost:${PORT}`;
// A remote browser cannot resolve the runner's `localhost`; `start` binds
// 0.0.0.0, so the compose service name reaches it.
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
    // On CI a retry filters flake first; locally there is no retry, so the
    // first failure must carry its own evidence.
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: process.env.CI ? 'off' : 'only-on-failure',
    video: process.env.CI ? 'off' : 'retain-on-failure',
    ...(wsEndpoint ? { connectOptions: { wsEndpoint } } : {}),
  },
  // Production build, against `sorrel_e2e` rather than the dev database.
  webServer: {
    command: 'npm run build && npm run start',
    url: webServerUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      PORT: String(PORT),
      DATABASE_URL: e2eDatabaseUrl(),
      // Out of `next dev`'s way — see next.config.ts.
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
