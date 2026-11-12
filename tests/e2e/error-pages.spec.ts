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
  await page.getByRole('link', { name: /back to sorrel/i }).click();
  await expect(page).toHaveURL('/');
});

// Report This carries the address the visitor asked for, never the framework's /_not-found.
// Each case signs in as its own address: the fixture account is created once per address.
for (const [index, path] of [
  '/coven/no-such-coven/nothing-here',
  '/compendium/nothing-here/at-all',
  '/nothing-here',
].entries()) {
  test(`Report This on a 404 at ${path} names that page`, async ({ page }) => {
    await signInAs(page, `reporter-${index}@error-pages.test`);
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);

    await page.getByRole('link', { name: 'Report This' }).click();
    const dialog = page.getByRole('dialog', { name: 'Contact Support' });
    await expect(dialog.getByRole('textbox', { name: 'Page' })).toHaveValue(path);
    await expect(dialog.getByRole('textbox', { name: 'Page' })).toHaveAccessibleDescription(
      /Opened from the Error 404 page/,
    );
    // Sweep gap: the Contact Support dialog opened from Report This, with its Page field described by the error page.
    await assertNoAccessibilityViolations(page);
  });
}

// The unmatched 404 draws inside the shell, as the notFound() 404 does: the bar's nav and the account
// menu stay in reach.
test('a signed-in visitor at an unknown address gets the 404 inside the shell', async ({
  page,
}) => {
  await signInAs(page, 'unknown-address@error-pages.test');
  const response = await page.goto('/nothing-here');

  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const banner = page.getByRole('banner');
  await expect(page.getByRole('navigation', { name: 'Site' })).toBeVisible();
  await expect(banner.getByRole('button', { name: 'Fixture Person' })).toBeVisible();
});

// An address that is no page answers 404 to a signed-out visitor too, in the public frame whose bar
// carries Sign In, rather than sending them to sign in for a page that does not exist.
test('a signed-out visitor at an unknown address gets a 404 in the public frame', async ({
  page,
}) => {
  const response = await page.goto('/nothing-here');

  expect(response?.status()).toBe(404);
  expect(new URL(page.url()).pathname).toBe('/nothing-here');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // The bar's Sign In carries the address the visitor is on, so signing in comes back to it.
  const signInHref = await page
    .getByRole('banner')
    .getByRole('link', { name: 'Sign In' })
    .getAttribute('href');
  const signIn = new URL(signInHref!, 'http://localhost');
  expect(signIn.pathname).toBe('/sign-in');
  expect(signIn.searchParams.get('next')).toBe('/nothing-here');
  await expect(page.getByRole('navigation', { name: 'Site' })).toBeVisible();
});
