import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';

// A printed card that is invalid or used shows the same page as a live one without the card's
// layout, so the salt drawing is hidden on a phone there as well.

/** The salt drawing is two layers, one per blend mode; each is measured by its computed display. */
const saltDisplays = (page: Page): Promise<string[]> =>
  page
    .locator('.backdrop--salt')
    .evaluateAll((layers) => layers.map((layer) => getComputedStyle(layer).display));

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('the salt drawing is hidden on a phone for a card that is not valid', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/i/not-a-real-card-token-0000');
  await expect(page.getByRole('main')).toBeVisible();
  expect(await saltDisplays(page)).toEqual(['none', 'none']);
});

test('the salt drawing is shown on a desktop for a card that is not valid', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/i/not-a-real-card-token-0000');
  await expect(page.getByRole('main')).toBeVisible();
  expect(await saltDisplays(page)).not.toContain('none');
});
