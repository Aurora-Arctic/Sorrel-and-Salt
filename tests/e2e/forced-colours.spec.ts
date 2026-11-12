import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAgainAs, signInAs, signInKeeperOnSidePage } from './session';
import { compendiumList, seedCoven, withSql } from './stories/coven-ingredients';
import { insertIngredient } from '../support/db/insert-ingredient';
import { insertCupboardEntry } from '../support/db/insert-cupboard-entry';
import { insertReference, insertReferenceLink } from '../support/db/insert-reference';
import { makeIngredient, makeVariant } from '../support/fixtures/ingredient';
import { ADD, HELD_MARK } from '../support/cupboard-wording';
import { ingredientSlug, slugify } from '@/lib/slugify';
import { insertWorkspace } from '../support/db/insert-workspace';

// The compendium section under forced colours: every surface keeps an edge, and every state a mark, in the system colours (claude-docs/styling.md, "Forced colours").
// A system colour is compared by what this browser resolves it to, read from a probe in the same page, so no assertion is tied to one palette.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const SYSTEM = [
  'Canvas',
  'CanvasText',
  'Highlight',
  'HighlightText',
  'GrayText',
  'LinkText',
] as const;
type Palette = Record<(typeof SYSTEM)[number], string>;

/** The pairs a test tells apart must differ, or a comparison between them proves nothing. */
async function systemColours(page: Page): Promise<Palette> {
  const palette = await page.evaluate((names) => {
    const found: Record<string, string> = {};
    for (const name of names) {
      const probe = document.createElement('div');
      probe.style.color = name;
      document.body.append(probe);
      found[name] = getComputedStyle(probe).color;
      probe.remove();
    }
    return found;
  }, SYSTEM);
  const p = palette as Palette;
  expect(p.CanvasText).not.toBe(p.Canvas);
  expect(p.Highlight).not.toBe(p.Canvas);
  expect(p.Highlight).not.toBe(p.CanvasText);
  expect(p.GrayText).not.toBe(p.CanvasText);
  expect(p.LinkText).not.toBe(p.Canvas);
  return p;
}

interface Line {
  width: number;
  style: string;
  color: string;
}
interface Drawn {
  color: string;
  background: string;
  content: string;
  borders: Line[];
  outline: Line;
}

function drawnOf(locator: Locator, pseudo: string | null = null): Promise<Drawn> {
  return locator.evaluate((el, pseudoElement) => {
    const s = getComputedStyle(el, pseudoElement);
    const line = (prefix: string) => ({
      width: parseFloat(s.getPropertyValue(`${prefix}-width`)) || 0,
      style: s.getPropertyValue(`${prefix}-style`),
      color: s.getPropertyValue(`${prefix}-color`),
    });
    return {
      color: s.color,
      background: s.backgroundColor,
      content: s.content,
      borders: ['top', 'right', 'bottom', 'left'].map((side) => line(`border-${side}`)),
      outline: line('outline'),
    };
  }, pseudo);
}

const shows = (line: Line) => line.width >= 1 && line.style !== 'none' && line.style !== 'hidden';

const edgeOf = async (locator: Locator) =>
  (await drawnOf(locator)).borders.map((side) => (shows(side) ? side.color : 'none'));

const marksOf = async (locator: Locator) => {
  const { borders, outline } = await drawnOf(locator);
  return [...borders, outline].filter(shows).map((line) => line.color);
};

const fillOf = async (locator: Locator) => {
  const { background, color } = await drawnOf(locator);
  return { background, color };
};

const inkOf = async (locator: Locator) => (await drawnOf(locator)).color;

// Axe measures the author's colours where the browser paints system ones, so it flags legible text.
const FORCED_SKIP = ['color-contrast'];

function held() {
  let open!: () => void;
  const gate = new Promise<void>((resolve) => (open = resolve));
  return { gate, open };
}

const refuse = (page: Page, operation: string, message: string) =>
  page.route('**/api/graphql', (route) =>
    route.request().postData()?.includes(operation)
      ? route.fulfill({ json: { data: null, errors: [{ message }] } })
      : route.continue(),
  );

// Every check of an item is soft, so one run shows each item that fails, not only the first.
const check = expect.configure({ soft: true, timeout: 2_000 });

async function seedSourcedEntry(author: string, name: string) {
  return withSql(async (sql) => {
    const id = await insertIngredient(
      sql,
      makeIngredient({
        name,
        nomenclature: 'none',
        variants: [makeVariant({ form: 'Fixture Root' })],
      }),
      author,
    );
    const reference = await insertReference(
      sql,
      {
        kind: 'web_page',
        title: `A Fixture Page on ${name}`,
        url: 'https://fixtures.example/',
        accessed: '2026-01-01',
      },
      author,
    );
    await insertReferenceLink(sql, id, reference, author);
    return { id, slug: slugify(name) };
  });
}

test.describe('under forced colours', () => {
  test.use({ forcedColors: 'active' });
  // Each test walks many screens, and a failing soft check waits out its own two seconds.
  test.describe.configure({ timeout: 90_000 });

  test('the public compendium list keeps its edges and marks its states', async ({ page }) => {
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
    const cards = compendiumList(page).locator(':scope > li');
    await expect(cards.first()).toBeVisible();
    const p = await systemColours(page);
    const card = cards.first().getByRole('article');

    await check.poll(() => edgeOf(card)).toEqual(Array(4).fill(p.CanvasText));
    await card.hover();
    await check.poll(() => marksOf(card)).toContain(p.Highlight);
    await page.mouse.move(0, 0);

    // Item 28: the pending dot, unseen at rest, is painted LinkText.
    const hint = card.locator('.link-hint').first();
    await expect(hint).toHaveCount(1);
    await check.poll(async () => (await drawnOf(hint)).background).toBe(p.LinkText);

    // Item 20: a .btn on a link has a Highlight border under the pointer; a <button> is excluded, as the browser rings it itself.
    const signIn = page.getByRole('link', { name: 'Sign In', exact: true }).first();
    await signIn.hover();
    await check.poll(() => marksOf(signIn)).toContain(p.Highlight);
    await page.mouse.move(0, 0);

    const filters = page.getByRole('button', { name: /^Filters/ });

    // Item 36, a guard: the focus ring stays, in a system colour.
    await filters.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(filters).toBeFocused();
    await check
      .poll(async () => {
        const { outline } = await drawnOf(filters);
        return shows(outline) && [p.CanvasText, p.Highlight].includes(outline.color);
      })
      .toBe(true);

    const prev = page
      .getByRole('navigation', { name: 'Pages' })
      .getByRole('link', { name: 'Prev' });
    await expect(prev).toBeDisabled();
    await check.poll(() => inkOf(prev)).toBe(p.GrayText);

    // Item 8: the pinned search row's CanvasText rule may sit on the row or on its fill.
    const row = page.getByRole('search');
    await page.mouse.move(0, 0);
    await page.evaluate(() => window.scrollTo(0, 1500));
    await expect(row).toHaveAttribute('data-stuck', 'true');
    const fill = row.locator(':scope > [aria-hidden="true"]');
    await check
      .poll(async () => {
        const feet = [(await edgeOf(row))[2]];
        if ((await fill.count()) > 0) feet.push((await edgeOf(fill.first()))[2]);
        return feet;
      })
      .toContain(p.CanvasText);
    await page.evaluate(() => window.scrollTo(0, 0));

    // Items 3 and 4: the +N button's hover and open marks, and the panel's edge.
    // Item 29: the search's page is held back, so the caret stays until it is read.
    const searching = held();
    await page.route(
      (url) => url.pathname === '/compendium' && url.searchParams.get('query') === 'Amethyst',
      async (route) => {
        await searching.gate;
        await route.continue();
      },
    );
    const search = page.getByRole('combobox', { name: 'Name' });
    await search.fill('Amethyst');
    await search.press('Enter');
    const caret = page.locator('.search-sentence__caret');
    await check(caret).toBeVisible();
    await check.poll(async () => (await drawnOf(caret)).background).toBe(p.CanvasText);
    searching.open();
    await page.unrouteAll({ behavior: 'wait' });
    await expect(page).toHaveURL(/query=/);
    const more = page.getByRole('button', { name: /more categories? for/i }).first();
    await expect(more).toBeVisible();
    // A guard: a <button> under the pointer, ringed in Highlight by the browser.
    await more.hover();
    await check.poll(() => marksOf(more)).toContain(p.Highlight);
    await more.click();
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    await page.mouse.move(0, 0);
    await check
      .poll(() => fillOf(more))
      .toEqual({ background: p.Highlight, color: p.HighlightText });
    const panel = page.getByRole('group', { name: /^More categories for/ }).first();
    await expect(panel).toBeVisible();
    await check.poll(() => edgeOf(panel)).toEqual(Array(4).fill(p.CanvasText));
    await page.keyboard.press('Escape');

    await page
      .getByRole('link', { name: /^Quick Look / })
      .first()
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await check.poll(() => edgeOf(dialog)).toEqual(Array(4).fill(p.CanvasText));
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);

    // Sweep gap: the page state reached in "the public compendium list keeps its edges and marks its states", which no sweep route or modal opens.
    await assertNoAccessibilityViolations(page, { skipRules: FORCED_SKIP });
  });

  test("the plus's menu marks hover and disabled, and the coven's list passes axe", async ({
    page,
    browser,
    baseURL,
  }) => {
    const NAME = 'Fixture Prismwort Menu';
    const FIRST = 'Fixture Coven Prism One';
    const SECOND = 'Fixture Coven Prism Two';
    const one = await seedCoven(page, FIRST, 'forced-colours-menu.test', { A: 'owner' });
    const member = one.users.A!;
    const second = await withSql((sql) =>
      sql.begin(async (tx) => {
        await tx`select set_config('app.current_user_id', ${member}, true)`;
        return insertWorkspace(tx, SECOND, [[member, 'owner']], {
          slug: 'fixture-coven-prism-two',
          author: member,
        });
      }),
    );
    const author = await signInKeeperOnSidePage(
      browser,
      baseURL,
      'author@forced-colours-menu.test',
    );
    const { id, slug } = await seedSourcedEntry(author, NAME);
    // The second coven holds the entry, so its item in the plus's menu is disabled.
    await withSql((sql) =>
      insertCupboardEntry(sql, { workspaceId: second, ingredientId: id }, member),
    );

    await signInAgainAs(page, member);
    await page.goto(`/compendium/ingredients/${slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(NAME);
    const p = await systemColours(page);

    const add = page.getByRole('main').getByRole('button', { name: ADD });
    const menu = page.getByRole('menu', { name: ADD });
    await add.hover();
    await check.poll(() => marksOf(add)).toContain(p.Highlight);
    await add.click();
    await expect(menu).toBeVisible();
    await expect(add).toHaveAttribute('aria-expanded', 'true');
    await check.poll(() => edgeOf(menu)).toEqual(Array(4).fill(p.CanvasText));

    const held = menu.getByRole('menuitem', { name: SECOND });
    const open = menu.getByRole('menuitem', { name: FIRST });
    await expect(held).toBeDisabled();
    await expect(held).toHaveAccessibleName(`${SECOND}, ${HELD_MARK}`);
    await expect(open).toBeEnabled();
    await check.poll(() => inkOf(held)).toBe(p.GrayText);
    await open.hover();
    await check.poll(() => marksOf(open)).toContain(p.Highlight);
    await page.mouse.move(0, 0);
    await check
      .poll(() => fillOf(add))
      .toEqual({ background: p.Highlight, color: p.HighlightText });
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);

    // Item 19: an icon button other than the plus, from the shared mixin.
    const more = page.getByRole('button', { name: `More for ${NAME}`, exact: true });
    await expect(more).toBeVisible();
    await more.hover();
    await check.poll(() => marksOf(more)).toContain(p.Highlight);
    await more.click();
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    await page.mouse.move(0, 0);
    await check
      .poll(() => fillOf(more))
      .toEqual({ background: p.Highlight, color: p.HighlightText });

    // Item 17, the select: with no jar held, the Unit box is shut, in GrayText.
    await page.getByRole('menuitem', { name: 'Edit Stock', exact: true }).click();
    const stock = page.getByRole('dialog', { name: /^Edit Stock/ });
    await expect(stock).toBeVisible();
    const unit = stock.getByRole('combobox', { name: /^Unit/ });
    await expect(unit).toHaveAttribute('aria-disabled', 'true');
    await check.poll(() => inkOf(unit)).toBe(p.GrayText);
    await check.poll(() => edgeOf(unit)).toEqual(Array(4).fill(p.GrayText));
    await page.keyboard.press('Escape');
    await expect(stock).toHaveCount(0);

    // Items 25 and 26: a refused add's callout triangle is CanvasText; dismissed, it leaves a badge.
    const REFUSED = 'This entry could not be added.';
    await refuse(page, 'AddCupboardEntry', REFUSED);
    await add.click();
    await menu.getByRole('menuitem', { name: FIRST }).click();
    const callout = page.getByRole('alert').filter({ hasText: REFUSED });
    await expect(callout).toBeVisible();
    await check
      .poll(async () => {
        const { content, background } = await drawnOf(callout, '::before');
        return content !== 'none' && background === p.CanvasText;
      })
      .toBe(true);
    const dismiss = callout.getByRole('button', { name: 'Dismiss' });
    await dismiss.hover();
    await check.poll(() => marksOf(dismiss)).toContain(p.Highlight);
    await dismiss.click();
    await expect(callout).toHaveCount(0);
    const badge = page.getByRole('button', { name: /^Show the error for / });
    await expect(badge).toBeVisible();
    await check.poll(async () => (await drawnOf(badge)).background).toBe(p.CanvasText);
    await check.poll(async () => (await drawnOf(badge, '::before')).background).toBe(p.Canvas);
    await page.unrouteAll();

    await page.goto(`/coven/fixture-coven-prism-two/ingredients`);
    await expect(page.getByRole('list', { name: 'Ingredients' })).toBeVisible();
    // Sweep gap: the page state reached in "the plus", which no sweep route or modal opens.
    await assertNoAccessibilityViolations(page, { skipRules: FORCED_SKIP });
  });

  test('the entry page marks its current section and the jumped-to note and source', async ({
    page,
    browser,
    baseURL,
  }) => {
    const author = await signInKeeperOnSidePage(
      browser,
      baseURL,
      'author@forced-colours-entry.test',
    );
    const { slug } = await seedSourcedEntry(author, 'Fixture Prismwort Entry');
    await page.goto(`/compendium/ingredients/${slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const p = await systemColours(page);

    const nav = page.getByRole('navigation', { name: 'On This Page' });
    const current = nav.locator('a[aria-current="location"]');
    await expect(current).toHaveCount(1);
    await check
      .poll(async () => {
        const { borders } = await drawnOf(current);
        return [borders[1]!, borders[3]!].some(
          (side) => shows(side) && side.width >= 2 && side.color === p.CanvasText,
        );
      })
      .toBe(true);
    const other = nav.locator('a:not([aria-current])').first();
    await other.hover();
    await check.poll(() => marksOf(other)).toContain(p.Highlight);
    await page.mouse.move(0, 0);

    await page.getByRole('link', { name: 'Note 1', exact: true }).click();
    await expect(page).toHaveURL(/#note-1$/);
    const note = page.locator('li:target');
    await expect(note).toHaveCount(1);
    await check.poll(() => marksOf(note)).toContain(p.Highlight);
    await note.getByRole('link').first().click();
    await expect(page).toHaveURL(/#ref-/);
    const source = page.getByRole('list', { name: 'Bibliography' }).locator('li:target');
    await expect(source).toHaveCount(1);
    await check.poll(() => marksOf(source)).toContain(p.Highlight);

    // Sweep gap: the page state reached in "the entry page marks its current section and the jumped-to note and source", which no sweep route or modal opens.
    await assertNoAccessibilityViolations(page, { skipRules: FORCED_SKIP });
  });

  test("the admin list's tray, table and switch keep their marks", async ({ page }) => {
    const { userId } = await signInAs(
      page,
      'admin@forced-colours-admin.test',
      ['discord'],
      'admin',
    );
    const BOTH = 'Fixture Glintwort Both';
    // Both comes in Bark and has two folk names, for the chip and promote actions.
    await withSql(async (sql) => {
      await insertIngredient(
        sql,
        makeIngredient({
          name: BOTH,
          nomenclature: 'none',
          categories: ['Protection', 'Cleansing'],
          folkNames: ['Hedge Glint', 'Lane Glint'],
          variants: [makeVariant({ form: 'Bark' })],
        }),
        userId,
      );
      await insertIngredient(
        sql,
        makeIngredient({
          name: 'Fixture Glintwort One',
          nomenclature: 'none',
          categories: ['Protection'],
        }),
        userId,
      );
    });
    await page.goto('/curator/compendium?query=Glintwort&categories=protection');
    const edit = page.getByRole('link', { name: 'Edit Fixture Glintwort Both' });
    await expect(edit).toBeVisible();
    const p = await systemColours(page);

    const editCell = edit.locator('xpath=ancestor::*[self::td or self::th][1]');
    await check
      .poll(async () => {
        const { content, background } = await drawnOf(editCell, '::before');
        return content !== 'none' && background === p.CanvasText;
      })
      .toBe(true);
    // Item 10, option A: the rule may be the row's or its cells', as the table collapses its borders.
    const bodyRow = edit.locator('xpath=ancestor::tr[1]');
    await check
      .poll(async () => [(await edgeOf(bodyRow))[2], (await edgeOf(editCell))[2]])
      .toContain(p.CanvasText);

    const shown = page.getByRole('switch', { name: 'Shown in Compendium: Fixture Glintwort Both' });
    await expect(shown).toBeChecked();
    const thumb = shown.locator('xpath=following-sibling::span[1]');
    await check.poll(async () => (await drawnOf(shown)).background).toBe(p.Highlight);
    await check.poll(async () => (await drawnOf(thumb)).background).toBe(p.HighlightText);

    await refuse(page, 'SetCompendiumEntryShown', 'This entry could not be hidden.');
    await shown.click();
    const notice = page.getByRole('main').getByRole('alert').first();
    await expect(notice).toBeVisible();
    await check
      .poll(async () => {
        const { content, background } = await drawnOf(notice, '::before');
        return content !== 'none' && background === p.CanvasText;
      })
      .toBe(true);
    await page.unrouteAll();

    await page.getByRole('button', { name: /^Filters/ }).click();
    const tray = page.getByRole('dialog', { name: 'Filters' });
    await expect(tray).toBeVisible();
    const match = tray.getByRole('group', { name: 'Match' });
    const off = match.getByRole('button', { name: /All/ });
    await expect(off).toBeDisabled();
    await check.poll(() => inkOf(off)).toBe(p.GrayText);

    const box = tray.getByRole('combobox', { name: 'Category' });
    await box.fill('cleansing');
    const option = page.getByRole('option', { name: /^Cleansing/ });
    await expect(option).toBeVisible();
    await box.press('ArrowDown');
    await expect(box).toHaveAttribute('aria-activedescendant', /.+/);
    const active = page.locator(`[id="${await box.getAttribute('aria-activedescendant')}"]`);
    await check
      .poll(() => fillOf(active))
      .toEqual({ background: p.Highlight, color: p.HighlightText });
    await option.click();

    const chip = tray
      .getByRole('button', { name: 'Remove Category: Cleansing' })
      .locator('xpath=ancestor::li[1]');
    await expect(chip).toBeVisible();
    await check.poll(() => edgeOf(chip)).toEqual(Array(4).fill(p.CanvasText));

    const forms = tray.getByRole('combobox', { name: 'Forms' });
    await forms.fill('bark');
    await page.getByRole('option', { name: /^Bark/ }).click();
    const formChip = tray
      .getByRole('button', { name: /^Remove Form: Bark/ })
      .locator('xpath=ancestor::li[1]');
    await expect(formChip).toBeVisible();
    await formChip.hover({ position: { x: 4, y: 4 } });
    await check.poll(() => marksOf(formChip)).toContain(p.Highlight);
    await page.mouse.move(0, 0);

    const summary = match.locator('summary');
    await expect(summary).toBeVisible();
    await summary.hover();
    await check.poll(() => marksOf(summary)).toContain(p.Highlight);
    await summary.click();
    await expect(match.getByRole('radio', { name: 'Any' })).toBeVisible();
    await page.mouse.move(0, 0);
    await check
      .poll(() => fillOf(summary))
      .toEqual({ background: p.Highlight, color: p.HighlightText });
    await page.keyboard.press('Escape');

    await page.goto('/curator/compendium');
    await expect(page.getByRole('link', { name: /^Edit / }).first()).toBeVisible();
    // Sweep gap: the page state reached in "the admin list", which no sweep route or modal opens.
    await assertNoAccessibilityViolations(page, { skipRules: FORCED_SKIP });

    await page.goto(`/compendium/ingredients/${ingredientSlug(BOTH, null)}`);
    const bar = page.getByRole('img', { name: /^Gained / });
    await expect(bar).toBeVisible();
    await check.poll(() => edgeOf(bar)).toEqual(Array(4).fill(p.CanvasText));
    const [gain, cost] = [bar.locator(':scope > span').nth(0), bar.locator(':scope > span').nth(1)];
    await check.poll(async () => (await drawnOf(gain)).background).toBe(p.Highlight);
    await check.poll(async () => (await drawnOf(cost)).background).toBe(p.CanvasText);

    // Item 6: the ingredient form saves on Close rather than asking, so the card is reached through its Delete question.
    await page.goto(`/curator/compendium?edit=${ingredientSlug(BOTH, null)}`);
    const editing = page.getByRole('dialog', { name: new RegExp(`^Edit Ingredient, ${BOTH}`) });
    await expect(editing).toBeVisible();
    await editing.getByRole('button', { name: 'Delete Ingredient' }).click();
    const card = editing.getByRole('group', { name: /Delete/ });
    await expect(card).toBeVisible();
    await check.poll(() => edgeOf(card)).toEqual(Array(4).fill(p.CanvasText));
    await card.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(card).toHaveCount(0);

    // Item 17, the chip action: the promotion is held back until the other folk name's action is read.
    await editing.getByRole('button', { name: 'Open All' }).click();
    const folk = editing.getByRole('group', { name: 'Folk Names', exact: true });
    const promoting = held();
    await page.route('**/api/graphql', async (route) => {
      if (route.request().postData()?.includes('PromoteFolkName')) await promoting.gate;
      await route.continue();
    });
    await folk
      .getByRole('button', { name: 'Make Hedge Glint the Display Name', exact: true })
      .click();
    await page.getByRole('button', { name: 'Promote', exact: true }).click();
    const other = folk.getByRole('button', {
      name: 'Make Lane Glint the Display Name',
      exact: true,
    });
    await check(other).toBeDisabled();
    await check.poll(() => inkOf(other)).toBe(p.GrayText);
    promoting.open();
    await page.unrouteAll({ behavior: 'wait' });
    await expect(editing.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue(
      'Hedge Glint',
    );

    await page.goto('/curator/compendium?new=ingredient-compendium');
    const adding = page.getByRole('dialog', { name: 'Add Ingredient' });
    await expect(adding).toBeVisible();
    await adding.getByRole('textbox', { name: 'Name', exact: true }).fill('Fixture Glintwort New');
    await adding.getByRole('button', { name: 'Save Ingredient' }).click();
    const classification = adding.getByRole('combobox', { name: 'Classification' });
    await expect(classification).toHaveAttribute('aria-invalid', 'true');
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await expect(classification).not.toBeFocused();
    await check
      .poll(async () => {
        const { outline } = await drawnOf(classification);
        return shows(outline) && outline.color === p.CanvasText;
      })
      .toBe(true);
  });
});

// A jump to a note or a note's mark fills its target as a jump to a source does: the :target fill
// once stood on the overflow-wrap rule, so only a source took it.
test('a jumped-to note and mark take the fill a jumped-to source takes', async ({
  page,
  browser,
  baseURL,
}) => {
  const author = await signInKeeperOnSidePage(
    browser,
    baseURL,
    'author@forced-colours-target.test',
  );
  const { slug } = await seedSourcedEntry(author, 'Fixture Prismwort Target');
  await page.goto(`/compendium/ingredients/${slug}`);
  const background = async (locator: Locator) => (await drawnOf(locator)).background;

  await page.getByRole('link', { name: 'Note 1', exact: true }).click();
  const note = page.locator('li:target');
  await expect(note).toHaveCount(1);
  await note.getByRole('link').first().click();
  const source = page.getByRole('list', { name: 'Bibliography' }).locator('li:target');
  await expect(source).toHaveCount(1);
  // Why the note could match: a source's fill is drawn, not transparent.
  const fill = await background(source);
  expect(fill).not.toBe('rgba(0, 0, 0, 0)');

  await source.getByRole('link', { name: 'Back to Note 1' }).click();
  await expect(page).toHaveURL(/#note-1$/);
  await check.poll(() => background(page.locator('li:target'))).toBe(fill);

  await page.locator('li:target').getByRole('link', { name: 'Back to Details' }).click();
  await expect(page).toHaveURL(/#note-ref-1$/);
  await check
    .poll(() => background(page.getByRole('link', { name: 'Note 1', exact: true })))
    .toBe(fill);
});
