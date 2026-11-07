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
  await expect(page.getByRole('banner').getByRole('link', { name: 'Sign In' })).toHaveAttribute(
    'href',
    '/sign-in',
  );
  await expect(page.getByRole('navigation', { name: 'Site' })).toBeVisible();
});

// The page under the refusal keeps the title it would have had, so a tab of 404s and 403s reads like the
// page refused. Each sets its own: the tab's title opens with the page's own heading.
test('the 404 and the 403 each title the tab by their own heading', async ({ page }) => {
  await signInAs(page, 'titles@error-pages.test');

  for (const [path, status] of [
    ['/nothing-here', 404],
    ['/keepers/users', 403],
    ['/curator', 403],
  ] as const) {
    expect((await page.goto(path))?.status(), path).toBe(status);
    const heading = (await page.getByRole('heading', { level: 1 }).textContent())?.trim() ?? '';
    expect(heading, path).not.toBe('');
    await expect.poll(async () => (await page.title()).split(' | ')[0], path).toBe(heading);
  }
});
