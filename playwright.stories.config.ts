import { defineConfig, devices } from '@playwright/test';
import { auditProjects } from './playwright.config';
import { HTML_REPORT, baseConfig } from './tests/e2e/base-config';
import { slotServers } from './tests/e2e/servers';

// The story suite: one browser flow per user story under tests/e2e/stories/, run by `npm run test:stories` and the PR gate's `stories` job. It shares the slot
// servers, databases and browser options with the gate suite (playwright.config.ts). A story that passes only on retry is counted as failing by the reporter.
export default defineConfig({
  ...baseConfig,
  testDir: './tests/e2e/stories',
  webServer: slotServers,
  retries: process.env.CI ? 1 : 0,
  passWithNoTests: true,
  reporter: [
    // Under Claude Code the per-test lines are dots; PW_REPORTER=list (or any
    // value) restores them for timings.
    [process.env.PW_REPORTER ?? (process.env.CLAUDECODE && !process.env.CI ? 'dot' : 'list')],
    ['./tests/support/story-playwright-reporter.ts', { outputFile: process.env.STORIES_JSON }],
    ...(process.env.CI ? ([['json'], ['html', HTML_REPORT]] as const) : []),
  ],
  // Under `E2E_AUDIT=1` (`npm run test:stories:audit`) the stories also run in
  // WebKit, Firefox and as a phone; the reporter counts a story passing only
  // when its test passes in every project that ran.
  projects: [{ name: 'stories', use: { ...devices['Desktop Chrome'] } }, ...auditProjects()],
});
