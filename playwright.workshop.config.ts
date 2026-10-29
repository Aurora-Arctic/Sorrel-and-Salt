import { defineConfig, devices } from '@playwright/test';
import { HTML_REPORT, baseConfig } from './tests/e2e/base-config';
import { WORKSHOP_PORT, browserUrl, serverUrl } from './tests/e2e/slots';

// The workshop specs, tests/e2e/workshop/ (`npm run e2e:workshop`): a component measured in its Storybook story. One server, Storybook's dev server, and no database,
// slot servers, setup or teardown; it binds 0.0.0.0, as `next start` does, for the remote browser.
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
    command: `npx storybook dev --host 0.0.0.0 --port ${WORKSHOP_PORT} --no-open --ci --disable-telemetry`,
    // Storybook's live-reload socket shares this port (Vite in middleware mode),
    // so unlike Storybook's there is no second port to give the block.
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
