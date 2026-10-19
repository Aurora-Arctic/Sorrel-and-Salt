import { test, expect } from '../fixtures';
import { recreateE2eDatabase } from '../database';

// Story 63: a visitor with no account opens the compendium from the front door and is
// not turned away. The page is public (MB.80); the chrome round it carries the way in, and
// following it reaches the sign-in page. What the page lists is M8.18's.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test(
  'a visitor with no account reads the compendium and follows Sign In',
  { tag: '@story-63' },
  async ({ page }) => {
    await page.goto('/');
    await page.getByRole('main').getByRole('link', { name: 'Browse the Compendium' }).click();

    await expect(page).toHaveURL(/\/compendium$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.getByRole('banner').getByRole('link', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/\/sign-in/);
  },
);
