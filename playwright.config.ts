import { defineConfig, devices } from '@playwright/test';
import { e2eDatabaseUrl } from './e2e/database';

// Deliberately separate from the dev server's 8000 (CLAUDE.md's Commands
// table) so `npm run dev` and an e2e run can sit side by side.
const PORT = 8001;
const baseURL = `http://localhost:${PORT}`;

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
    trace: 'on-first-retry',
  },
  // Production build, not `next dev` — this is what catches what the
  // component suite can't. `sorrel_e2e` (not the dev database) is wired in
  // via DATABASE_URL so a smoke-spec failure never touches local dev data.
  webServer: {
    command: 'npm run build && npm run start',
    url: baseURL,
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
