import type { Locator, Page } from '@playwright/test';
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
  compendiumList,
  compendiumVariant,
  ingredientList,
  insertStock,
  localIngredient,
  lowBadge,
  nameSearch,
  outBadge,
  rowOf,
  seedCoven,
  withSql,
} from './stories/coven-ingredients';

// The coven's Ingredients page (M9.6), against the built server. Stories 20–27
// (tests/e2e/stories/03-ingredients) walk a member through the list and its
// filters; this proves what no story walks: a non-member reads no such page,
// the pager holds its place and its filter, the Compact switch is the default
// and its opposite is in place before the page is drawn, the type-ahead offers
// this coven's cupboard and nothing else, each jar line carries its form's
// icon and M9.8's badge, a retired compendium entry the coven holds keeps
// its forms and categories and can be annotated and made its own, a held
// compendium entry's card opens Annotate over the list and closes back to its
// search (M8.17), a coven's own entry is deleted from its edit dialog over
// the list (M8.17), and the page passes axe at both densities and at a phone's
// width.

// The cards page by 24 (`CARD_PAGE_SIZE`), so 26 entries make two pages.
const PAGE_SIZE = 24;

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const listPath = (coven: Coven) => `/coven/${coven.slug}/ingredients`;

/** M9.6's Prev / "Page X of Y" / Next row. */
const pagerOf = (page: Page) => page.getByRole('navigation', { name: 'Pages' });

/** The Compact switch in the filter row (CardDensitySwitch). */
const compactSwitch = (page: Page) =>
  page.getByRole('search').getByRole('switch', { name: 'Compact' });

/** One jar line of a card, found by the quantity it reads. */
const jarOf = (row: Locator, quantity: string) =>
  row.getByRole('listitem').filter({ hasText: quantity });

/** A jar line's form icon: the first drawing in it, ahead of any badge's. */
const iconOf = (jar: Locator) => jar.locator('svg').first().innerHTML();

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
  // An answer with no match draws no options; give a match the moment to render.
  await page.waitForTimeout(0);
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
  await expect(page).toHaveURL(new RegExp(`/coven/${ours.slug}/ingredients/${own.ingredientId}$`));
});

test("each jar line reads its form and quantity, its form's icon, and the stock badge its jar earns", async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Gate Jars', 'gate-jars.test', {
    A: 'owner',
  });
  await withSql(async (sql) => {
    const A = coven.users.A;
    const jars = [
      // Above its threshold: no badge (M9.8).
      ['Rosemary', 'Herb', { quantity: 20, unit: 'g', threshold: 10 }],
      // At or under it: Low.
      ['Bay Laurel', 'Leaf', { quantity: 5, unit: 'g', threshold: 10 }],
      // Empty: Out, whatever the threshold.
      ['Selenite', 'Crystal', { quantity: 0, unit: 'piece', threshold: 1 }],
    ] as const;
    for (const [name, form, stock] of jars) {
      await insertStock(sql, coven.id, await compendiumVariant(sql, name, form), stock, A);
    }
    // A form outside the curated vocabulary, which draws the generic spoon; a
    // zero threshold turns the warning off.
    const testwort = await localIngredient(sql, coven.id, A, { variants: [makeVariant()] });
    await insertStock(sql, coven.id, testwort, { quantity: 3, unit: 'piece', threshold: 0 }, A);
  });

  await page.goto(listPath(coven));
  const list = ingredientList(page);
  await expect(cardsIn(list)).toHaveCount(4);

  const rosemary = jarOf(rowOf(list, 'Rosemary'), '20 g');
  const bay = jarOf(rowOf(list, 'Bay Laurel'), '5 g');
  const selenite = jarOf(rowOf(list, 'Selenite'), '0 piece');
  const testwort = jarOf(rowOf(list, 'Testwort'), '3 piece');
  for (const [jar, form] of [
    [rosemary, 'Herb'],
    [bay, 'Leaf'],
    [selenite, 'Crystal'],
    [testwort, 'Testform'],
  ] as const) {
    await expect(jar).toHaveCount(1);
    await expect(jar).toContainText(form);
  }

  await expect(lowBadge(rosemary)).toHaveCount(0);
  await expect(outBadge(rosemary)).toHaveCount(0);
  await expect(lowBadge(bay)).toBeVisible();
  await expect(outBadge(bay)).toHaveCount(0);
  await expect(outBadge(selenite)).toBeVisible();
  await expect(lowBadge(selenite)).toHaveCount(0);
  await expect(lowBadge(testwort)).toHaveCount(0);
  await expect(outBadge(testwort)).toHaveCount(0);

  // The icon follows the form's group: Herb and Leaf are both botanical, so
  // they draw alike; Crystal is mineral; the uncurated Testform is the spoon.
  const [herb, leaf, crystal, spoon] = await Promise.all(
    [rosemary, bay, selenite, testwort].map(iconOf),
  );
  expect(herb).not.toBe('');
  expect(leaf).toBe(herb);
  expect(new Set([herb, crystal, spoon]).size).toBe(3);
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

// M12.32 turned this on: the coven list reads a retired entry its cupboard
// still names, so the card draws, marked Retired.
test('a retired compendium entry the coven still holds keeps its forms and categories on its card', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Gate Retired', 'gate-retired.test', {
    A: 'owner',
  });
  const A = coven.users.A;
  const retiring = await withSql(async (sql) => {
    const ingredientId = await insertIngredient(
      sql,
      makeIngredient({
        name: 'Fixture Retiredwort',
        canonicalName: 'Fixtura emerita',
        variants: [makeVariant({ form: 'Herb' })],
        categories: ['Protection'],
      }),
      A,
    );
    await insertCupboardEntry(sql, { workspaceId: coven.id, ingredientId }, A);
    return ingredientId;
  });
  const onCompendium = async () => {
    await page.goto('/compendium');
    await nameSearch(page).fill('Fixture Retiredwort');
    await nameSearch(page).press('Enter');
    await expect(page).toHaveURL(/Retiredwort/);
    return rowOf(compendiumList(page), 'Fixture Retiredwort');
  };

  // Live, the entry is the compendium's like any other.
  await expect(await onCompendium()).toHaveCount(1);

  await withSql((sql) =>
    sql.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${A}, true)`;
      await tx`update ingredients set deleted_at = now(), deleted_by = ${A} where id = ${retiring}`;
    }),
  );

  // Why the forms and categories could have gone missing: retired, the entry
  // is gone from the compendium, so a read that filters retired rows finds none.
  await expect(await onCompendium()).toHaveCount(0);

  await page.goto(listPath(coven));
  const card = rowOf(ingredientList(page), 'Fixture Retiredwort');
  await expect(card).toHaveCount(1);
  await expect(card.getByRole('button', { name: 'Retired' })).toHaveCount(1);
  await expect(card).toContainText('Herb');
  await expect(card.getByRole('listitem').filter({ hasText: 'Protection' })).toHaveCount(1);
});

// The owner's decision of 2026-10-19, reversing part of M12.24: a coven goes
// on annotating a retired entry it holds, and may take it as its own or
// remove it.
test('a retired compendium entry the coven still holds can be annotated, then made its own', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Gate Retired Writes', 'gate-retired-w.test', {
    A: 'owner',
  });
  const A = coven.users.A;
  const retiredId = await withSql(async (sql) => {
    const ingredientId = await insertIngredient(
      sql,
      makeIngredient({
        name: 'Fixture Lapsedwort',
        canonicalName: 'Fixtura lapsa',
        variants: [makeVariant({ form: 'Herb' })],
      }),
      A,
    );
    await insertCupboardEntry(sql, { workspaceId: coven.id, ingredientId }, A);
    await sql.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${A}, true)`;
      await tx`update ingredients set deleted_at = now(), deleted_by = ${A} where id = ${ingredientId}`;
    });
    return ingredientId;
  });
  const heading = (name: string) => page.getByRole('heading', { level: 1, name });
  const choose = async (name: string) => {
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('menu').getByRole('menuitem', { name, exact: true }).click();
  };

  // Why the writes could be refused: the entry is retired, and the coven's
  // live cupboard row is all that still reaches it.
  await page.goto(`/coven/${coven.slug}/ingredients/${retiredId}`);
  await expect(heading('Fixture Lapsedwort')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retired' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'In the Compendium' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByRole('menu').getByRole('menuitem')).toHaveText([
    'Annotate',
    'Make It Ours',
    'Remove',
  ]);
  await page.keyboard.press('Escape');

  await choose('Annotate');
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Label' }).fill('Fixture Our Lapsedwort');
  await dialog.getByRole('button', { name: 'Save Annotation' }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole('heading', { level: 1, name: /Fixture Our Lapsedwort/ }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Annotated' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retired' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'In the Compendium' })).toHaveCount(0);

  await choose('Make It Ours');
  const ask = page.getByRole('dialog', { name: 'Make It Ours' });
  await ask.getByRole('button', { name: 'Make It Ours' }).click();
  await expect(page).toHaveURL(
    new RegExp(`/coven/${coven.slug}/ingredients/(?!${retiredId})[0-9a-f-]{36}$`),
  );
  await expect(page.getByText('Local', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retired' })).toHaveCount(0);
});

// M8.17: Annotate on the card of a compendium entry the coven holds opens the
// entry page's dialog over the list, and a close or a save comes back to the
// list as it was, its search kept and the focus on the card's Annotate. The
// dialog's More menu, opening upward inside it, removes the entry from the
// cupboard behind the confirmation dialog, back onto the same search without
// its card.
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

  // Why the save could leave a mark: the card is not yet annotated.
  await signInAgainAs(page, coven.users.A);
  await page.goto(searched);
  const card = rowOf(ingredientList(page), 'Fixture Notewort');
  await expect(card.getByRole('button', { name: 'Annotated' })).toHaveCount(0);
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
  const annotated = rowOf(ingredientList(page), 'Fixture Our Notewort');
  await expect(annotated.getByRole('button', { name: 'Annotated' })).toBeVisible();

  // More, then Remove: asked first, then gone from the cupboard and the list.
  // The menu opens upward from the dialog's foot and stays inside the dialog,
  // at a phone's width too, where More is as wide as Save above it.
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
  // Its items in More's own type, face, size and weight, and its top and
  // bottom padding and height (the owner's calls of 2026-10-20), where every
  // other menu keeps the lighter, shorter item.
  const typeOf = (element: Element) => {
    const style = getComputedStyle(element);
    return [style.fontFamily, style.fontSize, style.fontWeight]
      .concat([style.paddingTop, style.paddingBottom, style.minHeight])
      .join(' ');
  };
  const moreType = await moreButton.evaluate(typeOf);
  for (const item of await menu.getByRole('menuitem').all()) {
    expect(await item.evaluate(typeOf)).toBe(moreType);
  }
  await assertNoAccessibilityViolations(page);
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);

  const wide = page.viewportSize()!;
  await page.setViewportSize({ width: 375, height: 800 });
  await moreButton.scrollIntoViewIfNeeded();
  const save = (await dialog.getByRole('button', { name: 'Save Annotation' }).boundingBox())!;
  expect((await moreButton.boundingBox())!.width).toBeCloseTo(save.width, 0);
  await moreButton.click();
  await expectMenuInsideDialog();
  await page.keyboard.press('Escape');
  await page.setViewportSize(wide);

  // The question is the form's own card, over the form in this dialog, as
  // Delete and Link ask (the owner's call, 2026-10-20): Cancel keeps the
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

// M8.17 (moved from M9.10 by the owner, 2026-10-19): the coven's own entry
// is deleted from its edit dialog over the list, which closes back onto the
// list without the row, the focus on the page's heading since the card's Edit
// went with it.
test("a coven's own entry is deleted from its edit dialog over the list, back on the list without it", async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Gate List Delete', 'gate-list-del.test', {
    A: 'owner',
  });
  const gone = await withSql(async (sql) => {
    await localIngredient(sql, coven.id, coven.users.A, {
      name: 'Fixture Keptwort',
      canonicalName: 'Fixtura servata',
    });
    return localIngredient(sql, coven.id, coven.users.A, {
      name: 'Fixture Gonewort',
      canonicalName: 'Fixtura abiens',
    });
  });

  // Why it could stay: the entry is on the list, live, before the delete.
  await page.goto(listPath(coven));
  const list = ingredientList(page);
  await expect(rowOf(list, 'Fixture Gonewort')).toHaveCount(1);

  await rowOf(list, 'Fixture Gonewort')
    .getByRole('link', { name: 'Edit Fixture Gonewort, Fixtura abiens' })
    .click();
  const dialog = page.getByRole('dialog', { name: /Fixture Gonewort/ });
  await dialog.getByRole('button', { name: 'Delete Ingredient' }).click();
  const question = dialog.getByRole('group', { name: /Delete/ });
  await expect(question).toContainText('Fixture Gonewort');
  await question.getByRole('button', { name: 'Delete', exact: true }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL((url) => url.pathname === listPath(coven) && !url.search);
  await expect(rowOf(list, 'Fixture Gonewort')).toHaveCount(0);
  await expect(rowOf(list, 'Fixture Keptwort')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1, name: 'Ingredients' })).toBeFocused();
  const [row] = await withSql(
    (sql) => sql`select deleted_at from ingredients where id = ${gone.ingredientId}`,
  );
  expect(row.deleted_at).not.toBeNull();
});

test('a retired compendium entry the coven still holds can be removed, and leaves its list', async ({
  page,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Gate Retired Remove', 'gate-retired-r.test', {
    A: 'owner',
  });
  const A = coven.users.A;
  const retiredId = await withSql(async (sql) => {
    const ingredientId = await insertIngredient(
      sql,
      makeIngredient({
        name: 'Fixture Fadedwort',
        canonicalName: 'Fixtura evanida',
        variants: [makeVariant({ form: 'Herb' })],
      }),
      A,
    );
    await insertCupboardEntry(sql, { workspaceId: coven.id, ingredientId }, A);
    // A live entry beside it, so the list still renders once the retired one leaves.
    const keptId = await insertIngredient(
      sql,
      makeIngredient({ name: 'Fixture Keptwort', canonicalName: 'Fixtura servata' }),
      A,
    );
    await insertCupboardEntry(sql, { workspaceId: coven.id, ingredientId: keptId }, A);
    await sql.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${A}, true)`;
      await tx`update ingredients set deleted_at = now(), deleted_by = ${A} where id = ${ingredientId}`;
    });
    return ingredientId;
  });

  // Why it could stay listed: retired, the entry is still on the coven's list
  // while its cupboard row names it (M12.32).
  await page.goto(listPath(coven));
  await expect(rowOf(ingredientList(page), 'Fixture Fadedwort')).toHaveCount(1);

  await page.goto(`/coven/${coven.slug}/ingredients/${retiredId}`);
  await expect(page.getByRole('button', { name: 'Retired' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('menu').getByRole('menuitem', { name: 'Remove', exact: true }).click();
  const ask = page.getByRole('dialog', { name: 'Remove from Cupboard' });
  await ask.getByRole('button', { name: 'Remove', exact: true }).click();

  // The entry page reads nothing once the row is gone, so the remove leads to
  // the coven's Ingredients list rather than a 404.
  await expect(page).toHaveURL(new RegExp(`${listPath(coven)}$`));
  await expect(page.getByRole('heading', { level: 1, name: 'Ingredients' })).toBeVisible();
  await expect(rowOf(ingredientList(page), 'Fixture Keptwort')).toHaveCount(1);
  await expect(rowOf(ingredientList(page), 'Fixture Fadedwort')).toHaveCount(0);
});
