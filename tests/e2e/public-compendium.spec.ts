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

test('?withoutForms=1 lists what the unfiltered page lists, and offers no No Form control', async ({
  page,
  request,
}) => {
  const plain = await (await request.get('/compendium')).text();
  const asked = await (await request.get('/compendium?withoutForms=1')).text();

  expect(entryLinks(asked)).toEqual(entryLinks(plain));
  expect(asked).not.toContain('rel="canonical"');
  await page.goto('/compendium?withoutForms=1');
  await expect(page.getByRole('switch', { name: /^No Form/ })).toHaveCount(0);
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

// The search row sticks to the top once scrolled to (the owner's call, 2026-10-19): the box,
// the Filters button and Clear All stay in view while the cards go by, and the tray they open
// stays in view with them.
// The sticky box is the `<search>` landmark; the form inside is the controls alone.
const searchRow = (page: Page) => page.getByRole('search');
const searchForm = (page: Page) => searchRow(page).locator('form');

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

test('signed out, the search row sticks to the top of the window and its tray stays in view', async ({
  page,
}) => {
  await expectStuckRow(page, async () => 0);
});

test('signed in, the search row sticks under the top bar and its tray stays in view', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Sticky Row', 'sticky-row.test', {
    A: 'owner',
  });
  await signInAgainAs(page, coven.users.A);
  await expectStuckRow(page, async () => {
    const bar = await page.locator('.app-shell__bar').boundingBox();
    return bar!.y + bar!.height;
  });
});

test('the stuck row holds at 375px without a sideways scroll or an axe violation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto('/compendium');
  await expect(cardsOf(page).first()).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 1500));
  const row = await searchRow(page).boundingBox();
  expect(row?.y).toBeCloseTo(0, 0);
  await assertNoAccessibilityViolations(page);
  await assertNoSidewaysScroll(page);
});

test('the stuck row wears a shadow that is gone at the top, and the tray stays as near the input as before', async ({
  page,
}) => {
  await page.goto('/compendium');
  await expect(cardsOf(page).first()).toBeVisible();
  const row = searchRow(page);
  const shadow = () => row.evaluate((el) => getComputedStyle(el).boxShadow);

  await expect(row).not.toHaveAttribute('data-stuck', /.*/);
  expect(await shadow()).toBe('none');

  // The gap between the controls and the tray, read at the top of the page.
  await page.getByRole('button', { name: /^Filters/ }).click();
  const tray = page.getByRole('dialog', { name: 'Filters' });
  await expect(tray).toBeVisible();
  const gapAt = async () => {
    const form = (await searchForm(page).boundingBox())!;
    const box = (await tray.boundingBox())!;
    return box.y - (form.y + form.height);
  };
  await expect.poll(gapAt).toBeGreaterThanOrEqual(0);
  const gapAtTop = await gapAt();
  expect(gapAtTop).toBeLessThanOrEqual(12);
  await page.getByRole('button', { name: /^Filters/ }).click();
  await expect(tray).toBeHidden();

  await page.evaluate(() => window.scrollTo(0, 1500));
  await expect(row).toHaveAttribute('data-stuck', 'true');
  // The shadow fades in, so it is read once the transition has run.
  await expect.poll(shadow).not.toBe('none');

  await page.getByRole('button', { name: /^Filters/ }).click();
  await expect(tray).toBeVisible();
  await expect.poll(gapAt).toBeCloseTo(gapAtTop, 0);

  await page.getByRole('button', { name: /^Filters/ }).click();
  await expect(tray).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(row).not.toHaveAttribute('data-stuck', /.*/);
  await expect.poll(shadow).toBe('none');
});

// The first chips and the +N button share one line at full card width. Opening the panel
// floats it over the card, so the card and its grid row do not change height; a component
// test cannot measure either. No seeded entry has more than three categories, so the test
// files Amethyst under three more first, and holds the card at the grid's narrowest, 20rem.
test('the category chips and the +N button share one line, and opening the panel does not change the card height', async ({
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

  // The chips shown plus the count behind +N are all six; at the grid's narrowest card
  // width (20rem) the shown chips and the button sit on one line.
  const chips = card
    .getByRole('list', { name: 'Categories' })
    .locator('li:has(.chip):not(:has(button))');
  const count = Number(/\d+/.exec((await more.textContent()) ?? '')![0]);
  expect((await chips.count()) + count).toBe(6);
  const tops = await chips.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
  tops.push((await more.boundingBox())!.y);
  // One line: tops within a pixel (the chip and the button differ by half a pixel), far
  // under a line's height.
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(1);

  const before = (await card.boundingBox())!.height;
  await more.click();
  await expect(more).toHaveAttribute('aria-expanded', 'true');
  await expect(card.getByRole('group', { name: /^More categories for/ })).toBeVisible();
  expect((await card.boundingBox())!.height).toBe(before);

  await page.keyboard.press('Escape');
  await expect(more).toHaveAttribute('aria-expanded', 'false');
  await expect(more).toBeFocused();
});

test("the dot between a card's forms is level with the forms' icons", async ({ page }) => {
  await page.goto('/compendium');
  // The dot is drawn in CSS, so read where it sits from its item and its resolved margins.
  const { dot, icon } = await page.evaluate(() => {
    const second = [...document.querySelectorAll('.ingredient-card__item')].find((el) =>
      el.previousElementSibling?.matches('.ingredient-card__item'),
    )!;
    const box = second.getBoundingClientRect();
    const style = getComputedStyle(second, '::before');
    const svg = second.querySelector('svg')!.getBoundingClientRect();
    return {
      dot:
        box.top +
        parseFloat(style.top) +
        parseFloat(style.marginTop) +
        parseFloat(style.height) / 2,
      icon: svg.top + svg.height / 2,
    };
  });
  expect(Math.abs(dot - icon)).toBeLessThanOrEqual(1);
});
