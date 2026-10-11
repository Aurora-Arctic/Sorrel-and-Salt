import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';

// `fullyParallel` would split this file across workers, each running
// `beforeAll` and a share of the tests against its own slot's database.
// Serial keeps the file's tests in order on one worker, against its one
// reseed. Every db-touching spec file needs this.
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

// The front door, signed out (MB.57): reachable without a redirect, and
// axe-clean. Signed in, it swaps only the way in, for the landing of the
// visitor's role; where its links go is tests/app/page.test.tsx's.
test('the entry page renders signed out, without a redirect', async ({ page }) => {
  await page.goto('/');

  expect(new URL(page.url()).pathname).toBe('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // Nothing on the page is taller than the viewport, so nothing should scroll:
  // a viewport-high frame with its own padding once overflowed by the padding.
  const scrolls = await page.evaluate(
    () => document.documentElement.scrollHeight > document.documentElement.clientHeight,
  );
  expect(scrolls).toBe(false);
  await assertNoAccessibilityViolations(page);
});

// The ornaments are imported assets, so they are served under /_next/static
// with a content hash and never touch the proxy's deny-by-default rule.
test("the entry page's backdrop images are served, hashed, under /_next/static", async ({
  page,
}) => {
  await page.goto('/');
  const urls = await page.evaluate(() =>
    [...document.querySelectorAll('.backdrop')].map(
      (el) => new URL(getComputedStyle(el).backgroundImage.slice(5, -2), location.href).pathname,
    ),
  );

  expect(urls).toHaveLength(4);
  for (const url of new Set(urls)) {
    expect(url).toMatch(/^\/_next\/static\/media\/.+\.webp$/);
    const response = await page.request.get(url, { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('image/webp');
  }
});

// Signed in, the way in is the landing a sign-in with no return path gets
// (MB.113): followed here for an admin, to the admin area.
test('the entry page continues a signed-in admin to the admin area', async ({ page }) => {
  await signInAs(page, 'an-admin@entry-page.test', ['discord'], 'admin');
  await page.goto('/');

  await expect(page.getByRole('link', { name: 'Sign In' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Continue' }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Admin' })).toBeVisible();
});

// Facebook appends `#_=_` to the redirect URI, and a fragment survives every
// redirect whose Location carries none, so it reaches whatever page a sign-in
// lands on; the root layout strips exactly that one before first paint.
test("strips Facebook's #_=_ fragment and no other", async ({ page }) => {
  await page.goto('/#_=_');
  expect(new URL(page.url()).hash).toBe('');

  await page.goto('/#top');
  expect(new URL(page.url()).hash).toBe('#top');
});
