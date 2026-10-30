import { defineConfig } from '@playwright/test';
import { HTML_REPORT } from './tests/e2e/base-config';

// The every-story check, run by hand with `npm run workshop:check` against a Storybook already running on WORKSHOP_CHECK_URL. No webServer, database or
// `connectOptions`: the check connects to the browser server itself (claude-docs/workshop.md, "The every-story check").
export default defineConfig({
  testDir: './tests/e2e/workshop',
  testMatch: /every-story\.check\.ts$/,
  outputDir: '.reports/test-results',
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', HTML_REPORT]],
});
