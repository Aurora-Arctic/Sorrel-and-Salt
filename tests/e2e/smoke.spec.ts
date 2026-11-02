import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll } from './axe';
import { recreateE2eDatabase } from './database';

// `fullyParallel` splits this file across workers, each reseeding its own slot's database in `beforeAll`;
// a test signs in its own user and reads only seed rows, so none waits on another
// (claude-docs/testing/e2e.md, "Reseeding between spec files").

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

// The front door, signed out: reachable without a redirect, nothing sideways at a phone's width, and
// axe-clean in both themes. Signed in, it swaps only the way in (links are tests/app/page.test.tsx's).
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
  await assertNoSidewaysScroll(page);
  // Playwright's context is light unless told otherwise, and the site's own
  // default is dark, so each theme is named.
  for (const colorScheme of ['dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme });
    await assertNoAccessibilityViolations(page);
  }
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

  await page.goto('/#top');
  expect(new URL(page.url()).hash).toBe('#top');
});

// Highlighted text swaps the page's two colours, so it keeps the page's own contrast in both themes
// and is never the accent green.
test('selected text swaps the page ink and ground in each theme', async ({ page }) => {
  await page.goto('/');
  for (const colorScheme of ['dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme });
    const colours = await page.evaluate(() => {
      const page = getComputedStyle(document.body);
      const picked = getComputedStyle(document.body, '::selection');
      const root = getComputedStyle(document.documentElement);
      return {
        ink: root.getPropertyValue('--text-primary').trim(),
        ground: root.getPropertyValue('--surface-page').trim(),
        selectionBackground: picked.backgroundColor,
        selectionInk: picked.color,
        pageInk: page.color,
        pageGround: page.backgroundColor,
      };
    });
    expect(colours.selectionBackground).toBe(colours.pageInk);
    expect(colours.selectionInk).not.toBe(colours.selectionBackground);
    expect(colours.selectionInk).toBe(colours.pageGround);
  }
});
