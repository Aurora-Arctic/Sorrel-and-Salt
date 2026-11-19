import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { HELP, seedHelpArticles } from './help-articles';

// A crawler fetches every stylesheet a page names, so the count is read from the page as loaded: each file a
// stylesheet link or a style preload names, once however many tags name it.

const MAX_STYLESHEET_FILES = 10;

test.beforeAll(async () => {
  await recreateE2eDatabase();
  await seedHelpArticles('author@stylesheet-count.test');
});

async function stylesheetFiles(page: Page, path: string): Promise<string[]> {
  await page.goto(path);
  const hrefs = await page
    .locator('link[rel="stylesheet"][href], link[rel="preload"][as="style"][href]')
    .evaluateAll((links) => links.map((link) => (link as HTMLLinkElement).href));
  return [...new Set(hrefs)];
}

test('a public page loads at most ten stylesheet files', async ({ page }) => {
  await page.goto('/compendium');
  const entry = await page
    .locator('a[href^="/compendium/ingredients/"]')
    .first()
    .getAttribute('href');
  // Preconditions: the list links an entry, and the help fixture's guide is public.
  expect(entry).toBeTruthy();

  const paths = ['/compendium', entry as string, '/terms', `/help/${HELP.guide.slug}`];
  const counts: Record<string, number> = {};
  for (const path of paths) counts[path] = (await stylesheetFiles(page, path)).length;

  // Every page names some stylesheet, so a zero means the count read nothing, not that the limit holds.
  for (const path of paths) expect(counts[path], path).toBeGreaterThan(0);
  for (const path of paths)
    expect.soft(counts[path], path).toBeLessThanOrEqual(MAX_STYLESHEET_FILES);
});
