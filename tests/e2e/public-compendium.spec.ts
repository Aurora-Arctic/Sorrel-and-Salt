import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAgainAs, signInAs } from './session';
import { insertReference, insertReferenceLink } from '../support/db/insert-reference';
import { compendiumList, seedCoven, withSql } from './stories/coven-ingredients';

// The public compendium page (M8.18; MB.80), against the built server. Story 14 walks a
// visitor through narrowing the list and opening an entry (tests/e2e/stories/02-compendium);
// this proves what no story walks: the page is whole in the HTML as served, the curators'
// No Refs filter does nothing here, a filtered view asks to stay out of search results, the
// pager reaches the last page, the foot of each card follows the visitor's role, and the
// page holds at a phone's width.

// The cards page by 24 (`CARD_PAGE_SIZE`), so the grid ends on a full row.
const PAGE_SIZE = 24;
const ADD = 'Add to My Ingredients';

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

/** The list's cards: its direct items, since a card holds lists of its own. */
const cardsOf = (page: Page) => compendiumList(page).locator(':scope > li');

/** Every entry link in a page of HTML, in the order it was drawn. */
const entryLinks = (html: string): string[] =>
  [...html.matchAll(/href="(\/compendium\/ingredients\/[^"]+)"/g)].map(([, href]) => href);

async function seededCount(): Promise<number> {
  const [row] = await withSql(
    (sql) =>
      sql<{ count: number }[]>`
        select count(*)::int as count from ingredients
        where workspace_id is null and deleted_at is null`,
  );
  return row.count;
}

test('signed out, the page opens without a redirect and every card links to its entry', async ({
  page,
}) => {
  const total = await seededCount();
  // Why a second page exists to be reached below.
  expect(total).toBeGreaterThan(PAGE_SIZE);

  const response = await page.goto('/compendium');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/compendium$/);

  const cards = cardsOf(page);
  await expect(cards).toHaveCount(PAGE_SIZE);
  // Each card is one link to its entry's page, the only link in it.
  for (const card of await cards.all()) {
    await expect(card.locator('a[href^="/compendium/ingredients/"]')).toHaveCount(1);
  }
  await expect(page.getByRole('button', { name: ADD })).toHaveCount(0);
  // A visitor with no account has no action on the cards: Sign In is the header's alone.
  await expect(compendiumList(page).getByRole('link', { name: 'Sign In' })).toHaveCount(0);
  await expect(page.getByRole('banner').getByRole('link', { name: 'Sign In' })).toHaveAttribute(
    'href',
    '/sign-in',
  );
});

test('the server HTML holds the unfiltered list, every card and every link', async ({
  request,
}) => {
  const html = await (await request.get('/compendium')).text();
  const links = entryLinks(html);

  expect(links).toHaveLength(PAGE_SIZE);
  expect(new Set(links).size).toBe(PAGE_SIZE);
  // The page is drawn by the server, so the first entry in the list's order is in the markup.
  const [first] = await withSql(
    (sql) =>
      sql<{ slug: string }[]>`
        select slug from ingredients
        where workspace_id is null and deleted_at is null
        order by lower(name), lower(coalesce(canonical_name, name)), id
        limit 1`,
  );
  expect(links[0]).toBe(`/compendium/ingredients/${first.slug}`);
});

test('?withoutReferences=1 lists what the unfiltered page lists, and stays indexable', async ({
  page,
  request,
}) => {
  // The seed cites nothing, so one entry gets a source: with the curators' filter read, that
  // entry would drop out of the first page.
  const { userId } = await signInAs(page, 'curator@public-compendium.test');
  const [first] = await withSql(
    (sql) =>
      sql<{ id: string }[]>`
        select id from ingredients
        where workspace_id is null and deleted_at is null
        order by lower(name), lower(coalesce(canonical_name, name)), id
        limit 1`,
  );
  await withSql(async (sql) =>
    insertReferenceLink(sql, first.id, await insertReference(sql, {}, userId), userId),
  );

  const plain = await (await request.get('/compendium')).text();
  const asked = await (await request.get('/compendium?withoutReferences=1')).text();

  // The curators' filter would narrow the list if it were read: some entries do cite something.
  const unsourced = await withSql(
    (sql) =>
      sql<{ count: number }[]>`
        select count(*)::int as count from ingredients i
        where i.workspace_id is null and i.deleted_at is null
          and not exists (select 1 from reference_links r where r.ingredient_id = i.id)`,
  );
  expect(unsourced[0].count).not.toBe(await seededCount());

  expect(entryLinks(asked)).toEqual(entryLinks(plain));
  expect(asked).not.toContain('rel="canonical"');
});

test('a filtered view is noindex with the unfiltered page as its canonical address', async ({
  request,
}) => {
  const plain = await (await request.get('/compendium')).text();
  const filtered = await (await request.get('/compendium?query=wort')).text();

  expect(filtered).toMatch(/<meta name="robots" content="noindex/);
  expect(filtered).toMatch(/<link rel="canonical" href="[^"]*\/compendium"/);
  // Without a filter the page asks nothing of the sort.
  expect(plain).not.toContain('rel="canonical"');
  expect(plain).not.toMatch(/<meta name="robots" content="noindex/);
});

test('Next from the first page reaches a last page that reads Page Y of Y', async ({ page }) => {
  const pages = Math.ceil((await seededCount()) / PAGE_SIZE);
  expect(pages).toBeGreaterThan(1);

  await page.goto('/compendium');
  const pager = page.getByRole('navigation', { name: 'Pages' });
  await expect(pager.getByText(`Page 1 of ${pages}`)).toBeVisible();
  for (let reached = 2; reached <= pages; reached += 1) {
    await pager.getByRole('link', { name: 'Next' }).click();
    await expect(pager.getByText(`Page ${reached} of ${pages}`)).toBeVisible();
  }
  // Next is still drawn on the last page, but off: no address to follow.
  await expect(pager.getByRole('link', { name: 'Next' })).toBeDisabled();
});

test('the foot of a card follows the visitor: a button for an owner or member, nothing for a viewer', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Public Compendium', 'public-compendium.test', {
    A: 'owner',
    B: 'member',
    C: 'viewer',
  });
  // C belongs to this coven alone, and only views in it.
  const [{ count }] = await withSql(
    (sql) =>
      sql<{ count: number }[]>`
        select count(*)::int as count from workspace_members
        where user_id = ${coven.users.C} and deleted_at is null`,
  );
  expect(count).toBe(1);

  for (const key of ['A', 'B']) {
    await signInAgainAs(page, coven.users[key]);
    await page.goto('/compendium');
    const buttons = page.getByRole('button', { name: ADD });
    await expect(buttons).toHaveCount(PAGE_SIZE);
    // Disabled until M9.12 builds its dialog.
    await expect(buttons.first()).toBeDisabled();
    await expect(page.getByRole('link', { name: 'Sign In' })).toHaveCount(0);
  }

  await signInAgainAs(page, coven.users.C);
  await page.goto('/compendium');
  await expect(cardsOf(page)).toHaveCount(PAGE_SIZE);
  await expect(page.getByRole('button', { name: ADD })).toHaveCount(0);
  await expect(compendiumList(page).getByRole('link', { name: 'Sign In' })).toHaveCount(0);
});

test('the page is accessible and holds at 375px', async ({ page }) => {
  await page.goto('/compendium');
  await expect(cardsOf(page).first()).toBeVisible();
  await assertNoAccessibilityViolations(page);
  await assertNoSidewaysScroll(page);
});
