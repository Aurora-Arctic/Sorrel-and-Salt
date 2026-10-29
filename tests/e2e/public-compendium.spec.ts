import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAgainAs, signInAs } from './session';
import { makeIngredient, makeVariant } from '../support/fixtures/ingredient';
import { ADD, HELD } from '../support/cupboard-wording';
import { insertIngredient } from '../support/db/insert-ingredient';
import { compendiumList, seedCoven, withSql } from './stories/coven-ingredients';

// The public compendium page, against the built server. Story 14 walks a
// visitor through narrowing the list and opening an entry (tests/e2e/stories/02-compendium);
// this proves what no story walks: the page is whole in the HTML as served, the pager
// reaches the last page, one coven's add shows as held to its other members on the cached
// list, the search row sticks under the top bar, the category chips cover every category, a
// curator's Edit opens the compendium's edit dialog over the search, and the page
// holds at a phone's width. The curators' filters doing nothing here, and a filtered view's
// noindex, are the page test's (tests/app/(public)/compendium/page.test.tsx) and seo.spec.ts's.

// The cards page by 24 (`CARD_PAGE_SIZE`), so the grid ends on a full row.
const PAGE_SIZE = 24;

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

// The viewer's empty foot is story 14's (tests/e2e/stories/02-compendium.spec.ts).
test("an owner's add shows as held to a member of the same coven, on the cached list", async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Public Compendium', 'public-compendium.test', {
    A: 'owner',
    B: 'member',
  });

  // The plus works: a member of one coven adds with a press, and the card shows the
  // check in its place. The covens' held marks are the coven's own, so B, in the same coven,
  // finds that card already held when the page is opened.
  for (const [index, key] of ['A', 'B'].entries()) {
    await signInAgainAs(page, coven.users[key]);
    await page.goto('/compendium');
    const buttons = page.getByRole('button', { name: ADD });
    const held = page.getByRole('button', { name: HELD });
    await expect(buttons).toHaveCount(PAGE_SIZE - index);
    await expect(held).toHaveCount(index);
    await expect(buttons.first()).toBeEnabled();
    if (index === 0) {
      await buttons.first().click();
      await expect(held).toHaveCount(1);
      await expect(buttons).toHaveCount(PAGE_SIZE - 1);
    }
    await expect(page.getByRole('link', { name: 'Sign In' })).toHaveCount(0);
  }
});

// The search row sticks to the top once scrolled to: the box,
// the Filters button and Clear All stay in view while the cards go by, and the tray they open
// stays in view with them.
// The sticky box is the `<search>` landmark; the form inside is the controls alone.
const searchRow = (page: Page) => page.getByRole('search');
const searchForm = (page: Page) => searchRow(page).locator('form');

// Both frames carry a sticky bar, so the row sticks under whichever bar the page has.
const barBottom = async (page: Page) => {
  const bar = await page.locator('.app-shell__bar, .public-frame__bar').first().boundingBox();
  return bar!.y + bar!.height;
};

async function expectStuckRow(page: Page, offset: () => Promise<number>) {
  await page.goto('/compendium');
  await expect(cardsOf(page).first()).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 1500));
  // Scrolled well past the row's place in the page.
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
  const row = await searchRow(page).boundingBox();
  expect(row?.y).toBeCloseTo(await offset(), 0);

  await page.getByRole('button', { name: /^Filters/ }).click();
  const tray = page.getByRole('dialog', { name: 'Filters' });
  await expect(tray).toBeVisible();
  // The slide settles before the tray's box is read.
  await expect
    .poll(async () => {
      const box = await tray.boundingBox();
      return box ? Math.round(box.y + box.height) : 0;
    })
    .toBeGreaterThan(0);
  const viewport = page.viewportSize();
  const settled = await tray.boundingBox();
  const rowBottom = (await searchForm(page).boundingBox())!;
  expect(settled!.y).toBeGreaterThanOrEqual(rowBottom.y + rowBottom.height - 1);
  expect(settled!.y + settled!.height).toBeLessThanOrEqual(viewport!.height + 1);
}

test('signed out, the search row sticks under the top bar and its tray stays in view', async ({
  page,
}) => {
  await expectStuckRow(page, () => barBottom(page));
});

test('signed in, the search row sticks under the top bar and its tray stays in view', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Sticky Row', 'sticky-row.test', {
    A: 'owner',
  });
  await signInAgainAs(page, coven.users.A);
  await expectStuckRow(page, () => barBottom(page));
});

// Under the narrow column the row is two lines, the search box and then Filters beside Clear All,
// and both stick together as the desktop row does.
test('the stuck row holds at 375px without a sideways scroll or an axe violation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto('/compendium');
  await expect(cardsOf(page).first()).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 1500));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
  const row = await searchRow(page).boundingBox();
  expect(row?.y).toBeCloseTo(await barBottom(page), 0);
  // The Filters button sticks with the search box, inside the window and under the box.
  const box = await searchForm(page).locator(':scope > :first-child').boundingBox();
  const filters = await page.getByRole('button', { name: /^Filters/ }).boundingBox();
  expect(filters!.y).toBeGreaterThanOrEqual(box!.y + box!.height - 1);
  expect(filters!.y + filters!.height).toBeLessThanOrEqual(row!.y + row!.height + 1);
  expect(filters!.y + filters!.height).toBeLessThanOrEqual(700);
  await assertNoAccessibilityViolations(page);
  await assertNoSidewaysScroll(page);
});

test('at 375px a control focused below the fold lands under the stuck search row, not behind it', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto('/compendium');
  await expect(cardsOf(page).first()).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 1500));
  // Tab walks from the top of the page, so focus a card's link far below the row directly:
  // the browser scrolls it into view, and `scroll-padding-top` keeps it clear of both lines.
  const link = cardsOf(page).nth(2).getByRole('link').first();
  await link.focus();
  const [box, focused] = await Promise.all([searchRow(page).boundingBox(), link.boundingBox()]);
  expect(focused!.y).toBeGreaterThanOrEqual(box!.y + box!.height - 1);
});

test('the search row is marked stuck once scrolled past, and unmarked back at the top', async ({
  page,
}) => {
  await page.goto('/compendium');
  await expect(cardsOf(page).first()).toBeVisible();
  const row = searchRow(page);
  await expect(row).not.toHaveAttribute('data-stuck', /.*/);

  await page.evaluate(() => window.scrollTo(0, 1500));
  await expect(row).toHaveAttribute('data-stuck', 'true');

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(row).not.toHaveAttribute('data-stuck', /.*/);
});

// The chips shown and the +N button together account for every category. Opening the panel
// floats it over the card, so the card and its grid row do not change height; a component
// test cannot measure either. No seeded entry has more than three categories, so the test
// files Amethyst under three more first, and holds the card at the grid's narrowest, 20rem.
test('the category chips and the +N count cover every category, and opening the panel does not change the card height', async ({
  page,
}) => {
  await withSql(
    (sql) => sql`
      insert into ingredient_categories (ingredient_id, category_id, created_by, updated_by)
      select link.ingredient_id, c.id, link.created_by, link.updated_by
      from (
        select ingredient_id, created_by, updated_by from ingredient_categories
        where ingredient_id = (
          select id from ingredients
          where name = 'Amethyst' and workspace_id is null and deleted_at is null)
        limit 1
      ) link
      cross join (
        select id from categories
        where deleted_at is null
          and name in ('Binding', 'Healing', 'Strength')
          and id not in (
            select category_id from ingredient_categories ic
            join ingredients i on i.id = ic.ingredient_id
            where i.name = 'Amethyst' and i.workspace_id is null)
      ) c`,
  );
  await page.goto('/compendium');
  const search = page.getByPlaceholder(/^Search names/);
  await search.fill('Amethyst');
  await search.press('Enter');
  await expect(page).toHaveURL(/query=/);
  const card = cardsOf(page)
    .filter({ has: page.getByRole('button', { name: /more categories? for/i }) })
    .first();
  await expect(card).toBeVisible();
  await card.evaluate((el) => el.style.setProperty('width', '20rem'));
  const more = card.getByRole('button', { name: /more categories? for/i });
  await expect(more).toBeVisible();

  // The chips shown plus the count behind +N are all six, at the grid's narrowest card
  // width (20rem).
  const chips = card
    .getByRole('list', { name: 'Categories' })
    .locator('li:has(.chip):not(:has(button))');
  const count = Number(/\d+/.exec((await more.textContent()) ?? '')![0]);
  expect((await chips.count()) + count).toBe(6);

  const before = (await card.boundingBox())!.height;
  await more.click();
  await expect(more).toHaveAttribute('aria-expanded', 'true');
  await expect(card.getByRole('group', { name: /^More categories for/ })).toBeVisible();
  expect((await card.boundingBox())!.height).toBe(before);

  await page.keyboard.press('Escape');
  await expect(more).toHaveAttribute('aria-expanded', 'false');
  await expect(more).toBeFocused();
});

// A curator edits an entry from the public search, in the compendium's edit dialog over
// the results, and closes back onto the same search with the focus on the card's Edit. An
// account that cannot curate gets no Edit, and the same address opens nothing for it.
test("a curator's Edit opens the compendium's edit dialog over the search, and closes back to it", async ({
  page,
}) => {
  const { userId } = await signInAs(
    page,
    'a-curator@public-compendium-edit.test',
    ['discord'],
    'curator',
  );
  await withSql((sql) =>
    insertIngredient(
      sql,
      makeIngredient({
        name: 'Fixture Editwort',
        canonicalName: 'Fixtura editata',
        variants: [makeVariant({ form: 'Herb' })],
      }),
      userId,
    ),
  );
  const searched = '/compendium?query=Editwort';
  const dialog = page.getByRole('dialog', { name: /Edit Compendium Entry/ });
  const edit = page.getByRole('link', {
    name: 'Edit in Compendium Fixture Editwort, Fixtura editata',
  });

  await page.goto(searched);
  await edit.click();
  await expect(dialog.getByRole('button', { name: 'Open All' })).toBeVisible();
  await expect(page).toHaveURL((url) => url.searchParams.get('edit') !== null);

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL((url) => url.searchParams.get('query') === 'Editwort');
  await expect(page).toHaveURL((url) => !url.searchParams.has('edit'));
  await expect(edit).toBeFocused();
  const editAddress = await edit.getAttribute('href');
  // Why the refusal below is the guard's: loaded straight, the address opens the dialog here.
  await page.goto(editAddress!);
  await expect(dialog.getByRole('button', { name: 'Open All' })).toBeVisible();

  // The same address, for an account that cannot curate: the card, but no Edit and no dialog.
  const coven = await seedCoven(page, 'Fixture Coven Edit Refused', 'edit-refused.test', {
    A: 'owner',
  });
  await signInAgainAs(page, coven.users.A);
  await page.goto(editAddress!);
  await expect(cardsOf(page)).toHaveCount(1);
  await expect(edit).toHaveCount(0);
  await expect(dialog).toHaveCount(0);
});
