import { test, expect } from './fixtures';
import { assertNoSidewaysScroll } from './axe';
import { recreateE2eDatabase } from './database';

// `fullyParallel` splits this file across workers, each reseeding its own slot's database in `beforeAll`;
// a test signs in its own user and reads only seed rows, so none waits on another
// (claude-docs/testing/e2e.md, "Reseeding between spec files").

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('the entry page renders signed out, without a redirect', async ({ page }) => {
  await page.goto('/');

  expect(new URL(page.url()).pathname).toBe('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // The welcome page fills the window and the footer starts at the fold, so the page scrolls by the footer.
  const edges = await page.evaluate(() => ({
    welcomeBottom: document.querySelector('.welcome-page')!.getBoundingClientRect().bottom,
    footerTop: document.querySelector('.site-footer')!.getBoundingClientRect().top,
    viewport: window.innerHeight,
  }));
  expect(Math.abs(edges.welcomeBottom - edges.viewport)).toBeLessThanOrEqual(1);
  expect(Math.abs(edges.footerTop - edges.viewport)).toBeLessThanOrEqual(1);
  // The footer sits at the foot of the window on a short page, never above it.
  const footer = await page.getByRole('contentinfo').boundingBox();
  expect(footer ? footer.y + footer.height : 0).toBeGreaterThanOrEqual(edges.viewport - 1);
  await assertNoSidewaysScroll(page);
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

// Facebook appends `#_=_` to the redirect URI, and a fragment survives every
// redirect whose Location carries none, so it reaches whatever page a sign-in
// lands on; the root layout strips exactly that one before first paint.
test("strips Facebook's #_=_ fragment and no other", async ({ page }) => {
  await page.goto('/#_=_');
  expect(new URL(page.url()).hash).toBe('');

  // A change of fragment alone stays in the same document, where the script never runs and the router, still hydrating,
  // writes back the address it read before the change; leaving the page first makes this a fresh load.
  await page.goto('about:blank');
  await page.goto('/#top');
  expect(new URL(page.url()).hash).toBe('#top');
});
