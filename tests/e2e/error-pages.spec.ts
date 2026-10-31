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

// Report This carries the address the visitor asked for, never the framework's /_not-found.
for (const path of [
  '/coven/no-such-coven/nothing-here',
  '/compendium/nothing-here/at-all',
  '/nothing-here',
]) {
  test(`Report This on a 404 at ${path} names that page`, async ({ page }) => {
    await signInAs(page, 'reporter@error-pages.test');
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);

    await page.getByRole('link', { name: 'Report This' }).click();
    const dialog = page.getByRole('dialog', { name: 'Contact Support' });
    await expect(dialog.getByRole('textbox', { name: 'Page' })).toHaveValue(path);
    await expect(dialog.getByRole('textbox', { name: 'Page' })).toHaveAccessibleDescription(
      /Opened from the Error 404 page/,
    );
    await assertNoAccessibilityViolations(page);
  });
}
