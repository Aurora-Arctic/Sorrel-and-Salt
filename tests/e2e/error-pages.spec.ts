import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';

// Against the built server: the 404 page a signed-in visitor lands on,
// with its way onward. The 500 boundary is covered by tests/app/error.test.tsx;
// no page throws on demand to walk it here.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('a coven that is not yours is a 404 inside the shell, with a way home', async ({ page }) => {
  await signInAs(page, 'lost@error-pages.test');
  const response = await page.goto('/coven/no-such-coven');

  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await assertNoSidewaysScroll(page);
  await assertNoAccessibilityViolations(page);
  await page.getByRole('link', { name: /back to sorrel/i }).click();
  await expect(page).toHaveURL('/');
});
