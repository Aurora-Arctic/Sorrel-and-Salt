import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import { makeIngredient, makeVariant } from '../support/fixtures/ingredient';
import { insertCupboardEntry } from '../support/db/insert-cupboard-entry';
import { insertIngredient } from '../support/db/insert-ingredient';
import {
  type Coven,
  cardsIn,
  compendiumVariant,
  ingredientList,
  insertStock,
  localIngredient,
  nameSearch,
  rowOf,
  seedCoven,
  withSql,
} from './stories/coven-ingredients';

// The coven's Ingredients page against the built server, for what no story walks: a non-member's 404, the pager,
// the Compact switch before paint, the type-ahead scoped to this cupboard, Annotate over the list, and axe at
// both densities and a phone's width.

// The cards page by 24 (`CARD_PAGE_SIZE`), so 26 entries make two pages.
const PAGE_SIZE = 24;

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const listPath = (coven: Coven) => `/coven/${coven.slug}/ingredients`;

/** The Prev / "Page X of Y" / Next row. */
const pagerOf = (page: Page) => page.getByRole('navigation', { name: 'Pages' });

/** The Compact switch in the filter row (CardDensitySwitch). */
const compactSwitch = (page: Page) =>
  page.getByRole('search').getByRole('switch', { name: 'Compact' });

/** The labels the open type-ahead offers, once it has answered `text`. */
async function offered(page: Page, text: string): Promise<string[]> {
  const responded = page.waitForResponse(
    (response) =>
      response.url().includes('/api/graphql') &&
      (response.request().postData() ?? '').includes(text),
  );
  await nameSearch(page).fill(text);
  await responded;
  const listbox = page.getByRole('listbox');
  // The answer has landed once it draws: its options, or the line that says nothing matched.
  await expect(
    listbox
      .getByRole('option')
      .first()
      .or(page.getByText(/^No match for/))
      .first(),
  ).toBeVisible();
  return (await listbox.count()) === 0 ? [] : listbox.getByRole('option').allTextContents();
}

test('a non-member is told the page does not exist, at the address a member reads', async ({
  page,
}) => {
  const ours = await seedCoven(page, 'Fixture Coven Gate Ours', 'gate-ours.test', { A: 'owner' });
  const theirs = await seedCoven(page, 'Fixture Coven Gate Theirs', 'gate-theirs.test', {
    D: 'owner',
  });

  // An entry, so the member's page draws its list (an empty cupboard draws none).
  await withSql((sql) => localIngredient(sql, ours.id, ours.users.A));

  // Why the page could have been served: the coven exists, live, and a member reads it.
  const [row] = await withSql(
    (sql) =>
      sql<{ deleted: boolean }[]>`
        select deleted_at is not null as deleted from workspaces where id = ${ours.id}`,
  );
  expect(row).toEqual({ deleted: false });
  await signInAgainAs(page, ours.users.A);
  const member = await page.goto(listPath(ours));
  expect(member?.status()).toBe(200);
  await expect(cardsIn(ingredientList(page))).toHaveCount(1);

  // D is signed in and reads a coven of D's own, so the refusal is about membership alone.
  await signInAgainAs(page, theirs.users.D);
  const own = await page.goto(listPath(theirs));
  expect(own?.status()).toBe(200);

  const outsider = await page.goto(listPath(ours));
  expect(outsider?.status()).toBe(404);
  await expect(ingredientList(page)).toHaveCount(0);
});

test('the pager keeps its page through a reload, and Prev and Next keep the filter', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Gate Pager', 'gate-pager.test', {
    A: 'owner',
  });
  const LOCAL = PAGE_SIZE + 2;
  await withSql(async (sql) => {
    for (let n = 1; n <= LOCAL; n += 1) {
      await localIngredient(sql, coven.id, coven.users.A, {
        name: `Fixture Pagewort ${String(n).padStart(2, '0')}`,
        nomenclature: 'none',
      });
    }
    // A compendium jar, which the Local filter must keep off every page.
    const rosemary = await compendiumVariant(sql, 'Rosemary', 'Herb');
    await insertStock(
      sql,
      coven.id,
      rosemary,
      { quantity: 20, unit: 'g', threshold: 10 },
      coven.users.A,
    );
  });

  const list = ingredientList(page);
  const cards = cardsIn(list);
  const pager = pagerOf(page);

  await page.goto(`${listPath(coven)}?source=local`);
  await expect(cards).toHaveCount(PAGE_SIZE);
  await expect(pager.getByText('Page 1 of 2')).toBeVisible();

  await pager.getByRole('link', { name: 'Next' }).click();
  await expect(pager.getByText('Page 2 of 2')).toBeVisible();
  await expect(cards).toHaveCount(LOCAL - PAGE_SIZE);
  await expect(page).toHaveURL(/[?&]source=local(&|$)/);
  await expect(rowOf(list, 'Rosemary')).toHaveCount(0);

  await page.reload();
  await expect(pager.getByText('Page 2 of 2')).toBeVisible();
  await expect(cards).toHaveCount(LOCAL - PAGE_SIZE);

  await pager.getByRole('link', { name: 'Prev' }).click();
  await expect(pager.getByText('Page 1 of 2')).toBeVisible();
  await expect(cards).toHaveCount(PAGE_SIZE);
  await expect(page).toHaveURL(/[?&]source=local(&|$)/);
  await expect(rowOf(list, 'Rosemary')).toHaveCount(0);
});

test('Compact is the default, and Regular is remembered and in place before the page is drawn', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Gate Density', 'gate-density.test', {
    A: 'owner',
  });
  await withSql((sql) => localIngredient(sql, coven.id, coven.users.A));
  const html = page.locator('html');
  const stored = () =>
    page.evaluate(() => {
      try {
        return window.localStorage.getItem('card-density');
      } catch {
        return null;
      }
    });

  await page.goto(listPath(coven));
  await expect(cardsIn(ingredientList(page))).toHaveCount(1);
  await expect(compactSwitch(page)).toBeChecked();
  await expect(html).not.toHaveAttribute('data-card-density');
  expect(await stored()).toBeNull();

  await compactSwitch(page).click();
  await expect(compactSwitch(page)).not.toBeChecked();
  await expect(html).toHaveAttribute('data-card-density', 'regular');
  expect(await stored()).toBe('regular');

  // Records the document's density the moment the parser first inserts the
  // list, and whether the parser was still running: an attribute present then
  // was set by the pre-paint script, not by the page's JavaScript, which runs
  // only once parsing is done.
  await page.addInitScript(() => {
    const seen = window as unknown as {
      densityAtParse?: { density: string | null; state: string };
    };
    new MutationObserver((_records, observer) => {
      if (!document.querySelector('ul[aria-label="Ingredients"]')) return;
      seen.densityAtParse = {
        density: document.documentElement.getAttribute('data-card-density'),
        state: document.readyState,
      };
      observer.disconnect();
    }).observe(document, { childList: true, subtree: true });
  });

  await page.reload();
  await expect(cardsIn(ingredientList(page))).toHaveCount(1);
  expect(
    await page.evaluate(() => (window as unknown as { densityAtParse?: unknown }).densityAtParse),
  ).toEqual({ density: 'regular', state: 'loading' });
  await expect(compactSwitch(page)).not.toBeChecked();
  await expect(html).toHaveAttribute('data-card-density', 'regular');

  await compactSwitch(page).click();
  await expect(compactSwitch(page)).toBeChecked();
  await expect(html).not.toHaveAttribute('data-card-density');
  expect(await stored()).toBe('compact');
});

test("the type-ahead offers this coven's cupboard alone", async ({ page }) => {
  const ours = await seedCoven(page, 'Fixture Coven Gate Search', 'gate-search.test', {
    A: 'owner',
  });
  const theirs = await seedCoven(page, 'Fixture Coven Gate Elsewhere', 'gate-elsewhere.test', {
    D: 'owner',
  });
  const own = await withSql(async (sql) => {
    const held = await localIngredient(sql, ours.id, ours.users.A, {
      name: 'Fixture Mirrorwort',
      canonicalName: 'Fixtura nostra',
      folkNames: ['Cronewort'],
    });
    // The same label, and the same folk name, in a coven A has no part in.
    await localIngredient(sql, theirs.id, theirs.users.D, {
      name: 'Fixture Mirrorwort',
      canonicalName: 'Fixtura aliena',
      folkNames: ['Cronewort'],
    });
    const rosemary = await compendiumVariant(sql, 'Rosemary', 'Herb');
    await insertStock(
      sql,
      ours.id,
      rosemary,
      { quantity: 20, unit: 'g', threshold: 10 },
      ours.users.A,
    );
    return held;
  });

  // Why the type-ahead could have offered more: coven X's entry is live under
  // the same name and folk name, and the compendium's Mugwort, which A's coven
  // has not added, answers "Cronewort" where the compendium is searched.
  const [rows] = await withSql(
    (sql) =>
      sql<{ elsewhere: number; mugwort: number; added: number }[]>`
        select
          (select count(*)::int from ingredients
            where workspace_id = ${theirs.id} and name = 'Fixture Mirrorwort'
              and deleted_at is null) as elsewhere,
          (select count(*)::int from ingredients i
            join ingredient_folk_names f on f.ingredient_id = i.id
            where i.workspace_id is null and i.name = 'Mugwort' and f.name = 'Cronewort'
              and i.deleted_at is null) as mugwort,
          (select count(*)::int from workspace_compendium_entries e
            join ingredients i on i.id = e.ingredient_id
            where e.workspace_id = ${ours.id} and i.name = 'Mugwort') as added`,
  );
  expect(rows).toEqual({ elsewhere: 1, mugwort: 1, added: 0 });
  await signInAgainAs(page, ours.users.A);
  await page.goto('/compendium');
  expect(await offered(page, 'Cronewort')).toContainEqual(expect.stringMatching(/^Mugwort\b/));

  await page.goto(listPath(ours));
  await expect(cardsIn(ingredientList(page))).toHaveCount(2);

  expect(await offered(page, 'Cronewort')).toEqual(['Fixture Mirrorwort (Fixtura nostra)']);
  // A compendium entry the cupboard names is offered: the scope is the cupboard, not "own only".
  expect(await offered(page, 'Rosemary')).toContainEqual(expect.stringMatching(/^Rosemary\b/));
  expect(await offered(page, 'Mugwort')).toEqual([]);

  // Typed again, the answer may come from the client's cache, with no request to wait on.
  await nameSearch(page).fill('Cronewort');
  await page.getByRole('option', { name: 'Fixture Mirrorwort (Fixtura nostra)' }).click();
  // The pick opens the entry's Quick Look over the list.
  await expect(page.getByRole('dialog', { name: 'Fixture Mirrorwort', exact: true })).toBeVisible();
  await expect(page).toHaveURL(
    new RegExp(`/coven/${ours.slug}/ingredients\\?(.*&)?entry=${own.ingredientId}(&|$)`),
  );
});

test('the page passes axe at both densities and holds at a phone width', async ({ page }) => {
  const coven = await seedCoven(page, 'Fixture Coven Gate Axe', 'gate-axe.test', { A: 'owner' });
  await withSql(async (sql) => {
    const A = coven.users.A;
    await localIngredient(sql, coven.id, A);
    await insertStock(
      sql,
      coven.id,
      await compendiumVariant(sql, 'Bay Laurel', 'Leaf'),
      { quantity: 5, unit: 'g', threshold: 10 },
      A,
    );
    await insertStock(
      sql,
      coven.id,
      await compendiumVariant(sql, 'Selenite', 'Crystal'),
      { quantity: 0, unit: 'piece', threshold: 1 },
      A,
    );
  });

  await page.goto(listPath(coven));
  await expect(cardsIn(ingredientList(page))).toHaveCount(3);
  await assertNoAccessibilityViolations(page);

  await compactSwitch(page).click();
  await expect(page.locator('html')).toHaveAttribute('data-card-density', 'regular');
  await assertNoAccessibilityViolations(page);
  await assertNoSidewaysScroll(page);
});

// Annotate on a held compendium entry's card opens the entry page's dialog over the list; a close or save
// comes back to the list as it was, search kept and focus on the card's Annotate. The dialog's More menu,
// opening upward inside it, removes the entry from the cupboard behind a confirmation, back to the same search.
test("a held compendium entry's card opens Annotate over the list, and closes back to its search", async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Gate List Annotate', 'gate-list-ann.test', {
    A: 'owner',
    C: 'viewer',
  });
  const ingredientId = await withSql(async (sql) => {
    const id = await insertIngredient(
      sql,
      makeIngredient({
        name: 'Fixture Notewort',
        canonicalName: 'Fixtura notata',
        variants: [makeVariant({ form: 'Herb' })],
      }),
      coven.users.A,
    );
    await insertCupboardEntry(sql, { workspaceId: coven.id, ingredientId: id }, coven.users.A);
    return id;
  });
  const searched = `${listPath(coven)}?query=Notewort`;
  const backAtSearch = async () => {
    await expect(page).toHaveURL((url) => url.searchParams.get('query') === 'Notewort');
    await expect(page).toHaveURL((url) => !url.searchParams.has('annotate'));
  };
  const annotateLink = page.getByRole('link', { name: /^Annotate Fixture/ });

  // A viewer reads the card with no Annotate on it.
  await signInAgainAs(page, coven.users.C);
  await page.goto(searched);
  await expect(rowOf(ingredientList(page), 'Fixture Notewort')).toHaveCount(1);
  await expect(annotateLink).toHaveCount(0);

  // Why the save could show: the card still carries the compendium's name.
  await signInAgainAs(page, coven.users.A);
  await page.goto(searched);
  const card = rowOf(ingredientList(page), 'Fixture Notewort');
  await expect(card).toHaveCount(1);
  await expect(rowOf(ingredientList(page), 'Fixture Our Notewort')).toHaveCount(0);
  const link = card.getByRole('link', { name: 'Annotate Fixture Notewort, Fixtura notata' });

  await link.click();
  const dialog = page.getByRole('dialog', { name: 'Annotate This Entry' });
  await expect(dialog.getByRole('textbox', { name: 'Label' })).toBeVisible();
  await expect(page).toHaveURL((url) => url.searchParams.has('annotate'));

  // Unchanged, Escape closes it, back onto the search and the card's Annotate.
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await backAtSearch();
  await expect(link).toBeFocused();

  await link.click();
  await dialog.getByRole('textbox', { name: 'Label' }).fill('Fixture Our Notewort');
  await dialog.getByRole('button', { name: 'Save Annotation' }).click();
  await expect(dialog).toHaveCount(0);
  await backAtSearch();
  // The save shows as the coven's label; the card wears no Annotated, which is the
  // entry page's to say.
  const annotated = rowOf(ingredientList(page), 'Fixture Our Notewort');
  await expect(annotated).toHaveCount(1);
  await expect(annotated.getByRole('button', { name: 'Annotated' })).toHaveCount(0);

  // More, then Remove: asked first, then gone from the cupboard and the list.
  // The menu opens upward from the dialog's foot and stays inside the dialog,
  // at a phone's width too.
  await annotated.getByRole('link', { name: /^Annotate Fixture Our Notewort/ }).click();
  const moreButton = dialog.getByRole('button', { name: 'More' });
  const menu = dialog.getByRole('menu', { name: 'More' });
  const expectMenuInsideDialog = async () => {
    const outer = (await dialog.boundingBox())!;
    const inner = (await menu.boundingBox())!;
    expect(inner.y).toBeGreaterThanOrEqual(outer.y);
    expect(inner.x).toBeGreaterThanOrEqual(outer.x);
    expect(inner.y + inner.height).toBeLessThanOrEqual(outer.y + outer.height);
    expect(inner.x + inner.width).toBeLessThanOrEqual(outer.x + outer.width);
  };
  await moreButton.click();
  await expect(menu.getByRole('menuitem')).toHaveText(['Make It Ours', 'Remove']);
  await expectMenuInsideDialog();
  await assertNoAccessibilityViolations(page);
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);

  const wide = page.viewportSize()!;
  await page.setViewportSize({ width: 375, height: 800 });
  await moreButton.scrollIntoViewIfNeeded();
  await moreButton.click();
  await expectMenuInsideDialog();
  await page.keyboard.press('Escape');
  await page.setViewportSize(wide);

  // The question is the form's own card, over the form in this dialog, as
  // Delete asks: Cancel keeps the
  // dialog, the focus back on More.
  const question = dialog.getByRole('group', {
    name: /^Remove Fixture Our Notewort from your cupboard\?/,
  });
  await moreButton.click();
  await menu.getByRole('menuitem', { name: 'Remove' }).click();
  await expect(question).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await question.getByRole('button', { name: 'Cancel' }).click();
  await expect(question).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(moreButton).toBeFocused();

  await moreButton.click();
  await menu.getByRole('menuitem', { name: 'Remove' }).click();
  await question.getByRole('button', { name: 'Remove', exact: true }).click();

  await expect(dialog).toHaveCount(0);
  await backAtSearch();
  await expect(rowOf(ingredientList(page), 'Fixture Our Notewort')).toHaveCount(0);
  const held = await withSql(
    (sql) =>
      sql`select 1 from workspace_compendium_entries
           where workspace_id = ${coven.id} and ingredient_id = ${ingredientId} and deleted_at is null`,
  );
  expect(held).toHaveLength(0);
});

// A card's More near the window's foot opens above the button, where there is more room, and stays inside the
// window at a desktop's width and a phone's, where the fixed bottom bar takes the foot.
test("a card's More opened near the window's foot opens above it, inside the window", async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Gate Menu Foot', 'gate-menu-foot.test', {
    A: 'owner',
  });
  // A held compendium entry, whose More holds two choices; a coven's own entry draws Edit and
  // no More and no Delete, which its Edit Ingredient dialog holds.
  await withSql(async (sql) => {
    const ingredientId = await insertIngredient(
      sql,
      makeIngredient({ name: 'Fixture Footwort', canonicalName: 'Fixtura pedis' }),
      coven.users.A,
    );
    await insertCupboardEntry(sql, { workspaceId: coven.id, ingredientId }, coven.users.A);
    await localIngredient(sql, coven.id, coven.users.A, {
      name: 'Fixture Ownwort',
      canonicalName: 'Fixtura propria',
    });
  });
  await page.goto(listPath(coven));
  const own = rowOf(ingredientList(page), 'Fixture Ownwort');
  await expect(own.getByRole('link', { name: /^Edit Fixture Ownwort/ })).toBeVisible();
  await expect(own.getByRole('button', { name: /^Delete/ })).toHaveCount(0);
  await expect(own.getByRole('button', { name: /^More for/ })).toHaveCount(0);
  const more = rowOf(ingredientList(page), 'Fixture Footwort').getByRole('button', {
    name: /^More for Fixture Footwort/,
  });
  const menu = page.getByRole('menu', { name: /^More for Fixture Footwort/ });

  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 800 });
    // The window cut off just beneath More, with the bottom bar's room when
    // the bar is drawn, so less room is left below it than the menu needs.
    const bar = await page.evaluate(() => {
      const nav = [...document.querySelectorAll('nav')].find(
        (element) => getComputedStyle(element).position === 'fixed',
      );
      return nav ? nav.getBoundingClientRect().height : 0;
    });
    await more.scrollIntoViewIfNeeded();
    const button = (await more.boundingBox())!;
    const height = Math.ceil(button.y + button.height + bar + 16);
    await page.setViewportSize({ width, height });
    await more.scrollIntoViewIfNeeded();
    await more.click();
    await expect(menu.getByRole('menuitem')).toHaveText(['Make It Ours', 'Remove']);
    const at = (await more.boundingBox())!;
    const box = (await menu.boundingBox())!;
    // Why it could have opened below: the room under More is less than the menu.
    expect(height - bar - (at.y + at.height)).toBeLessThan(box.height);
    expect(box.y + box.height).toBeLessThanOrEqual(at.y);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    await page.keyboard.press('Escape');
    await expect(more).toBeFocused();
  }
});

// ListFrame: a pager end keeps the reader at the list rather than Next's jump to the page top, then brings
// the list's start to the line the stuck search row leaves (the root's scroll-padding-top). A filter's page
// is Next's own scroll, to the top. Measured here because happy-dom draws no layout to scroll.
test("a pager end lands on the new page's first entries", async ({ page }) => {
  const coven = await seedCoven(page, 'Fixture Coven Pager Scroll', 'pager-scroll.test', {
    A: 'owner',
  });
  // Two full pages and one more, so the second page is as tall as the first.
  const LOCAL = PAGE_SIZE * 2 + 1;
  await withSql(async (sql) => {
    for (let n = 1; n <= LOCAL; n += 1) {
      await localIngredient(sql, coven.id, coven.users.A, {
        name: `Fixture Scrollwort ${String(n).padStart(2, '0')}`,
        nomenclature: 'none',
      });
    }
  });

  const list = ingredientList(page);
  const pager = pagerOf(page);
  const paddingLine = () =>
    page.evaluate(
      () => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0,
    );
  const firstCardTop = async () => (await cardsIn(list).first().boundingBox())!.y;

  await page.goto(`${listPath(coven)}?source=local`);
  await expect(pager.getByText('Page 1 of 3')).toBeVisible();
  // At the foot of the page, the list's start far above the line: the case
  // the scroll is for.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const line = await paddingLine();
  expect(await firstCardTop()).toBeLessThan(line);

  await pager.getByRole('link', { name: 'Next' }).click();
  await expect(pager.getByText('Page 2 of 3')).toBeVisible();
  await expect(cardsIn(list)).toHaveCount(PAGE_SIZE);
  // The new page's first card is in view, at or below the line, and the
  // window is still at the list, not the top of the page.
  await expect.poll(firstCardTop).toBeGreaterThanOrEqual(line - 1);
  expect(await firstCardTop()).toBeLessThan(page.viewportSize()!.height);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});
