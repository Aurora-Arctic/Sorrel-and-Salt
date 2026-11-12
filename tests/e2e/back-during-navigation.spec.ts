import type { Route } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAgainAs, signInAs } from './session';
import { slotUrl } from './slots';
import { hydrated, requiredDelay } from './waits';
import { compendiumList, rowOf, seedCoven, withSql } from './stories/coven-ingredients';
import { insertIngredient } from '../support/db/insert-ingredient';
import { makeIngredient } from '../support/fixtures/ingredient';
import { ingredientSlug } from '@/lib/slugify';

const NAME = 'Fixture Backwort';
const FORMAL = 'Fixtura retrorsa';

// Every test reads the compendium entry seeded here.
test.beforeAll(async ({ browser, slot }) => {
  await recreateE2eDatabase();
  const admin = await browser.newPage({ baseURL: slotUrl(slot) });
  try {
    const { userId } = await signInAs(admin, 'admin@back-nav.test', ['discord'], 'admin');
    await withSql((sql) =>
      insertIngredient(sql, makeIngredient({ name: NAME, canonicalName: FORMAL }), userId),
    );
  } finally {
    await admin.close();
  }
});

test.use({ reducedMotion: 'reduce' });

/** Resolves once every request the route held has been answered or has failed. */
const answered = (held: readonly { response(): Promise<unknown> }[]) =>
  Promise.all(held.map((request) => request.response().catch(() => null)));

test('Back pressed while a compendium entry is still loading returns to the compendium', async ({
  page,
}) => {
  const slug = ingredientSlug(NAME, FORMAL);
  const coven = await seedCoven(page, 'Fixture Coven Back', 'back-nav.test', { A: 'owner' });
  await signInAgainAs(page, coven.users.A);

  await page.goto('/coven');
  await page.goto(`/compendium?query=${encodeURIComponent(NAME)}`);
  await expect(rowOf(compendiumList(page), NAME)).toBeVisible();

  // Holds every request for the entry (document and RSC alike) until released.
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  let requested = false;
  const heldRequests: ReturnType<Route['request']>[] = [];
  await page.route(`**/compendium/ingredients/${slug}*`, async (route) => {
    requested = true;
    heldRequests.push(route.request());
    await held;
    await route.continue().catch(() => {});
  });

  await rowOf(compendiumList(page), NAME).getByRole('link', { name: NAME, exact: true }).click();
  await expect.poll(() => requested).toBe(true);
  await page.goBack();
  await expect(page).toHaveURL(/\/compendium\?query=/);
  const afterBack = new URL(page.url()).pathname;
  release();
  await answered(heldRequests);
  expect(afterBack).toBe('/compendium');
  // The page that was left stays, with no skeleton over it, once the held request is let go.
  await expect(rowOf(compendiumList(page), NAME)).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Loading' })).toHaveCount(0);
  expect(new URL(page.url()).pathname).toBe('/compendium');
});

test('a navigation that is redirected on the way still adds exactly one history entry', async ({
  page,
}) => {
  const slug = ingredientSlug(NAME, FORMAL);
  const coven = await seedCoven(page, 'Fixture Coven Redirect', 'back-redirect.test', {
    A: 'owner',
  });
  await signInAgainAs(page, coven.users.A);
  await page.goto(`/compendium?query=${encodeURIComponent(NAME)}`);
  await expect(rowOf(compendiumList(page), NAME)).toBeVisible();
  const before = await page.evaluate(() => window.history.length);

  // The router's own request for the entry is answered with a redirect to the same entry under another query.
  await page.route(`**/compendium/ingredients/${slug}?_rsc=*`, async (route) => {
    if (route.request().headers()['next-router-prefetch']) return route.continue();
    await route.fulfill({
      status: 307,
      headers: { location: `/compendium/ingredients/${slug}?via=redirect` },
    });
  });
  await rowOf(compendiumList(page), NAME).getByRole('link', { name: NAME, exact: true }).click();
  await expect(page).toHaveURL(/via=redirect/);
  expect(await page.evaluate(() => window.history.length)).toBe(before + 1);

  await page.goBack();
  await expect(page).toHaveURL(/\/compendium\?query=/);
  await expect(rowOf(compendiumList(page), NAME)).toBeVisible();
});

async function openListAndPressCard(page: import('@playwright/test').Page) {
  const slug = ingredientSlug(NAME, FORMAL);
  const coven = await seedCoven(
    page,
    `Fixture Coven ${Math.random().toString(36).slice(2, 8)}`,
    `back-hold-${Math.random().toString(36).slice(2, 8)}.test`,
    {
      A: 'owner',
    },
  );
  await signInAgainAs(page, coven.users.A);
  await page.goto(`/compendium?query=${encodeURIComponent(NAME)}`);
  await expect(rowOf(compendiumList(page), NAME)).toBeVisible();
  await hydrated(page, `a[href*="/compendium/ingredients/${slug}"]`);
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  let requested = false;
  const heldRequests: ReturnType<Route['request']>[] = [];
  await page.route(`**/compendium/ingredients/${slug}*`, async (route) => {
    if (route.request().headers()['next-router-prefetch']) return route.continue();
    requested = true;
    heldRequests.push(route.request());
    await held;
    await route.continue().catch(() => {});
  });
  await rowOf(compendiumList(page), NAME).getByRole('link', { name: NAME, exact: true }).click();
  await expect.poll(() => requested).toBe(true);
  return {
    slug,
    letGo: async () => {
      release();
      await answered(heldRequests);
    },
  };
}

test('a request let go after Back does not carry the page to the entry', async ({ page }) => {
  const { letGo } = await openListAndPressCard(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/compendium\?query=/);
  const length = await page.evaluate(() => window.history.length);
  await letGo();
  await requiredDelay(
    1_000,
    'A late navigation to the entry would show only after the answer is handled, and the test asserts that none comes.',
  );
  expect(new URL(page.url()).pathname).toBe('/compendium');
  await expect(rowOf(compendiumList(page), NAME)).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: NAME })).toHaveCount(0);
  expect(await page.evaluate(() => window.history.length)).toBe(length);
});

test('Forward after Back during the wait shows the entry itself at its address', async ({
  page,
}) => {
  const { slug, letGo } = await openListAndPressCard(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/compendium\?query=/);
  await letGo();
  await page.goForward();
  await expect(page).toHaveURL(new RegExp(`/compendium/ingredients/${slug}$`));
  await expect(page.getByRole('heading', { name: NAME }).first()).toBeVisible();
  await expect(compendiumList(page)).toHaveCount(0);
});
