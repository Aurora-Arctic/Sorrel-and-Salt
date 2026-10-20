import { defineConfig, devices } from '@playwright/test';
import { HTML_REPORT, baseConfig } from './playwright.config';
import { WORKSHOP_HMR_PORT, WORKSHOP_PORT, browserUrl, serverUrl } from './tests/e2e/slots';

// The workshop specs, tests/e2e/workshop/: a component measured in its Ladle
// story, for a layout fact no page shows yet because no page uses the
// component (M12.31's click feedback, before its adoption). `npm run
// e2e:workshop`. One server, Ladle's dev server, and no database, so none of
// the e2e suite's slot servers, setup or teardown; the browser options are the
// suite's, reduced motion included, which a spec turns off where it measures
// a fade. Ladle binds 0.0.0.0, as `next start` does, for the remote browser.
export default defineConfig({
  outputDir: baseConfig.outputDir,
  testDir: './tests/e2e/workshop',
  fullyParallel: true,
  forbidOnly: baseConfig.forbidOnly,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['list'], ['json'], ['html', HTML_REPORT]]
    : process.env.CLAUDECODE
      ? [['dot'], ['html', HTML_REPORT]]
      : [['html', HTML_REPORT]],
  webServer: {
    command: `npx ladle serve --host 0.0.0.0 --port ${WORKSHOP_PORT}`,
    // Its live-reload socket on the block's port rather than the review
    // workshop's pinned 61002, read by .ladle/config.mjs. Not turned off
    // (`--noWatch`): in middleware mode Vite would still bind its default
    // 24678 for the socket, so the clash would only move.
    env: { LADLE_HMR_PORT: String(WORKSHOP_HMR_PORT) },
    url: serverUrl(WORKSHOP_PORT),
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'workshop',
      use: { ...baseConfig.use, ...devices['Desktop Chrome'], baseURL: browserUrl(WORKSHOP_PORT) },
    },
  ],
});
