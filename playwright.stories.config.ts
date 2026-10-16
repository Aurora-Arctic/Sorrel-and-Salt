import { defineConfig, devices } from '@playwright/test';
import { HTML_REPORT, baseConfig, slotServers } from './playwright.config';

// The story suite (M9.1): one browser flow per user story, under
// tests/e2e/stories/, run by `npm run test:stories` and by CI's own
// stories.yml workflow rather than the merge gate. It shares the slot servers,
// databases and browser options with the gate suite (playwright.config.ts) and
// nothing else: not the providers-configured or compendium-cache servers, which
// no story needs.
//
// A retry lets a run finish, but the reporter counts a story that passed only
// on retry as failing (tests/support/story-playwright-reporter.ts). With no
// story file yet the run passes and prints every story as "no test yet".
export default defineConfig({
  ...baseConfig,
  testDir: './tests/e2e/stories',
  webServer: slotServers,
  retries: process.env.CI ? 1 : 0,
  passWithNoTests: true,
  reporter: [
    ['list'],
    ['./tests/support/story-playwright-reporter.ts', { outputFile: process.env.STORIES_JSON }],
    ...(process.env.CI ? ([['json'], ['html', HTML_REPORT]] as const) : []),
  ],
  projects: [{ name: 'stories', use: { ...devices['Desktop Chrome'] } }],
});
