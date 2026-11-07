import { defineConfig, devices } from '@playwright/test';
import { HTML_REPORT, baseConfig } from './tests/e2e/base-config';
import { startupServer } from './tests/e2e/servers';

// The help articles' screenshots (`npm run help:screenshots`): tests/e2e/help-screenshots/ seeds a slot database,
// opens each page on the built server and writes its picture into public/help/screens/, to be committed. It is
// the gate suite's servers and databases, run on demand only (claude-docs/components/help-pages.md, "Screenshots").
export default defineConfig({
  ...baseConfig,
  testDir: './tests/e2e/help-screenshots',
  webServer: startupServer(true),
  retries: 0,
  reporter: [[process.env.CLAUDECODE && !process.env.CI ? 'dot' : 'list'], ['html', HTML_REPORT]],
  projects: [{ name: 'help-screenshots', use: { ...devices['Desktop Chrome'] } }],
});
