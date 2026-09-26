import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';

// `fullyParallel` would split this file across workers and run `beforeAll`
// once per worker, racing DROP/CREATE on `sorrel_e2e`. Every db-touching spec
// file needs this.
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

// The front door, signed out (MB.57): reachable without a redirect, says
// what the site is and that it is invite-only, and offers the sign-in page.
// The signed-in variant swaps only the way in and is covered by
// tests/components/Welcome; no e2e spec can sign in without a real provider.
test('the entry page renders signed out, without a redirect', async ({ page }) => {
  await page.goto('/');

  expect(new URL(page.url()).pathname).toBe('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Sorrel & Salt' })).toBeVisible();
  await expect(page.getByText(/invite-only/i)).toBeVisible();
  // Nothing on the page is taller than the viewport, so nothing should scroll:
  // a viewport-high frame with its own padding once overflowed by the padding.
  const scrolls = await page.evaluate(
    () => document.documentElement.scrollHeight > document.documentElement.clientHeight,
  );
  expect(scrolls).toBe(false);
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

test('the entry page leads to /sign-in', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
});

test('the entry page has no accessibility violations', async ({ page }) => {
  await page.goto('/');
  await assertNoAccessibilityViolations(page);
});
