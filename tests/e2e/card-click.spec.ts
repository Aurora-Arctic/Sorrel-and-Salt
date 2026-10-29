import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAgainAs, signInAs } from './session';
import {
  compendiumList,
  ingredientList,
  insertStock,
  localIngredient,
  lowBadge,
  rowOf,
  seedCoven,
  stockEditor,
  withSql,
} from './stories/coven-ingredients';
import { insertIngredient } from '../support/db/insert-ingredient';
import { makeIngredient, makeVariant } from '../support/fixtures/ingredient';
import { ingredientSlug } from '@/lib/slugify';

// A click anywhere on an ingredient card opens its entry, on the public compendium and on a coven's
// Ingredients page, while each control keeps its own action. The card is one stretched link
// (claude-docs/components/ingredient-card.md, "The whole card is the link"); jsdom does no hit-testing,
// so only a browser shows whether a click on empty space reaches the name's overlay.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

// The card's face slides down under the pointer (the drawer). Without motion it stays
// put, so a point measured on the card at rest is the same point on the card when it is pressed.
test.use({ reducedMotion: 'reduce' });

const FORMAL = 'Fixtura tactilis';

/** The card's own box: the `article` inside the list item. */
const faceOf = (card: Locator) => card.locator('article');

/** The name's link, the card's one link to its entry. */
const nameLink = (card: Locator, name: string) => card.getByRole('link', { name, exact: true });

type Point = { x: number; y: number };

/**
 * Presses the card at `point`, given relative to its face, after checking the point is on the
 * face and off every link and button on it: a press on the name would open the entry whatever
 * the rest of the card does, and a press on a control would test that control, so either would
 * prove nothing.
 */
async function pressCardAt(card: Locator, point: Point): Promise<void> {
  const face = await faceOf(card).boundingBox();
  if (!face) throw new Error('The card is not on the page');
  expect(point.x > 0 && point.x < face.width && point.y > 0 && point.y < face.height).toBe(true);
  const x = face.x + point.x;
  const y = face.y + point.y;
  const controls = await faceOf(card).locator('a, button').all();
  expect(controls.length, 'the card has controls to keep clear of').toBeGreaterThan(1);
  for (const control of controls) {
    const box = await control.boundingBox();
    if (!box) continue;
    const on = x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
    expect(
      on,
      `the press lands off ${await control.evaluate((el) => el.outerHTML.slice(0, 80))}`,
    ).toBe(false);
  }
  await faceOf(card).click({ position: point });
}

/** The middle of `target`, relative to the card's face. */
async function middleOf(card: Locator, target: Locator): Promise<Point> {
  const face = await faceOf(card).boundingBox();
  const box = await target.boundingBox();
  if (!face || !box) throw new Error('The card or the target is not on the page');
  return { x: box.x - face.x + box.width / 2, y: box.y - face.y + box.height / 2 };
}

/**
 * A point in the foot's actions row, in the gap just past `control` (the Quick Look eye at the
 * row's start), level with its middle: the row's own box, between its controls.
 */
async function gapAfter(card: Locator, control: Locator): Promise<Point> {
  const face = await faceOf(card).boundingBox();
  const box = await control.boundingBox();
  if (!face || !box) throw new Error('The card or the control is not on the page');
  return { x: box.x - face.x + box.width + 8, y: box.y - face.y + box.height / 2 };
}

/** A point in the card's own padding, at its right edge halfway down: no text, no control. */
async function blankPoint(card: Locator): Promise<Point> {
  const face = await faceOf(card).boundingBox();
  if (!face) throw new Error('The card is not on the page');
  return { x: face.width - 6, y: face.height / 2 };
}

/** The middle of the formal name's line, relative to the card's face. */
const formalPoint = (card: Locator): Promise<Point> =>
  middleOf(card, card.getByText(FORMAL, { exact: true }));

/** The names of the card's controls in tab order, from its name onwards. */
async function tabOrder(page: Page, card: Locator, name: string, count: number): Promise<string[]> {
  await nameLink(card, name).focus();
  const names: string[] = [];
  for (let n = 0; n < count; n += 1) {
    names.push(
      await page.evaluate(() => {
        const at = document.activeElement as HTMLElement | null;
        return at?.getAttribute('aria-label') ?? at?.textContent?.trim() ?? '';
      }),
    );
    await page.keyboard.press('Tab');
  }
  return names;
}

/**
 * Every control on the card but its name is at least 24 by 24 CSS pixels (WCAG 2.5.8, Target
 * Size (Minimum)): the overlay under them must not leave one smaller than that to press. The
 * name is left out, as inline text in a sentence-like line is exempt, and it is the link.
 */
async function expectTargets(card: Locator, name: string, named: Locator[]): Promise<void> {
  for (const control of named) await expect(control).toBeVisible();
  const controls = await faceOf(card).locator('a, button').all();
  for (const control of controls) {
    if ((await control.getAttribute('href')) === (await nameLink(card, name).getAttribute('href')))
      continue;
    const box = await control.boundingBox();
    if (!box) continue;
    const label = (await control.getAttribute('aria-label')) ?? (await control.innerText());
    test.info().annotations.push({
      type: 'target',
      description: `${label}: ${box.width.toFixed(1)} × ${box.height.toFixed(1)}`,
    });
    expect(box.width, `${label} width`).toBeGreaterThanOrEqual(24);
    expect(box.height, `${label} height`).toBeGreaterThanOrEqual(24);
  }
}

test('on the compendium, a press on a card outside its name opens its entry, and its plus, +N chip and Quick Look keep their own actions', async ({
  page,
  browser,
  baseURL,
}) => {
  const NAME = 'Fixture Tapwort';
  const slug = ingredientSlug(NAME, FORMAL);
  const coven = await seedCoven(page, 'Fixture Coven Tap', 'card-click.test', { A: 'owner' });
  const admin = await browser.newPage({ baseURL });
  try {
    const { userId } = await signInAs(admin, 'admin@card-click.test', ['discord'], 'admin');
    await withSql((sql) =>
      insertIngredient(
        sql,
        makeIngredient({
          name: NAME,
          canonicalName: FORMAL,
          // Three, so the card shows two chips and a +N button.
          categories: ['Protection', 'Warding', 'Banishing'],
        }),
        userId,
      ),
    );
  } finally {
    await admin.close();
  }
  const heldRows = () =>
    withSql(
      (sql) => sql<{ id: string }[]>`
        select e.id from workspace_compendium_entries e
        join ingredients i on i.id = e.ingredient_id
        where e.workspace_id = ${coven.id} and i.name = ${NAME} and e.deleted_at is null`,
    );
  const listPath = `/compendium?query=${encodeURIComponent(NAME)}`;
  const entryPath = new RegExp(`/compendium/ingredients/${slug}$`);
  const card = () => rowOf(compendiumList(page), NAME);
  const plus = () => card().getByRole('button', { name: 'Add to My Ingredients' });
  const more = () => card().getByRole('button', { name: `1 more category for ${NAME}` });
  const quickLook = () =>
    card().getByRole('link', { name: `Quick Look ${NAME}, ${FORMAL}`, exact: true });
  const open = async () => {
    await page.goto(listPath);
    await expect(card()).toBeVisible();
  };

  await signInAgainAs(page, coven.users.A);
  // Why the plus adds at once rather than opening a menu: A writes in one coven, which lacks it.
  expect(await heldRows()).toHaveLength(0);
  await open();

  await test.step('the name is the card’s one link to its entry, named by the name alone', async () => {
    await expect(nameLink(card(), NAME)).toHaveAttribute('href', `/compendium/ingredients/${slug}`);
    await expect(card().locator(`a[href="/compendium/ingredients/${slug}"]`)).toHaveCount(1);
    await expect(nameLink(card(), NAME)).toHaveAccessibleName(NAME);
  });

  await test.step('tab order runs name, +N, Quick Look, plus', async () => {
    expect(await tabOrder(page, card(), NAME, 4)).toEqual([
      NAME,
      `1 more category for ${NAME}`,
      `Quick Look ${NAME}, ${FORMAL}`,
      `Add to My Ingredients: ${NAME}, ${FORMAL}`,
    ]);
  });

  await test.step('every control but the name is at least 24 by 24', async () => {
    await expectTargets(card(), NAME, [more(), quickLook(), plus()]);
  });

  await test.step('a press on the formal name opens the entry', async () => {
    await pressCardAt(card(), await formalPoint(card()));
    await expect(page).toHaveURL(entryPath);
  });

  await test.step('a press on the card’s empty space opens the entry', async () => {
    await open();
    await pressCardAt(card(), await blankPoint(card()));
    await expect(page).toHaveURL(entryPath);
  });

  await test.step('a press between the foot’s controls opens the entry', async () => {
    await open();
    await pressCardAt(card(), await gapAfter(card(), quickLook()));
    await expect(page).toHaveURL(entryPath);
  });

  await test.step('a press on the New mark opens the entry', async () => {
    await open();
    await pressCardAt(card(), await middleOf(card(), card().locator('.recency-mark')));
    await expect(page).toHaveURL(entryPath);
  });

  await test.step('the +N chip opens its panel and stays on the list', async () => {
    await open();
    await more().click();
    await expect(more()).toHaveAttribute('aria-expanded', 'true');
    await expect(page).toHaveURL(new RegExp(`/compendium\\?query=`));
    await page.keyboard.press('Escape');
  });

  await test.step('Quick Look opens the details over the list, not the entry', async () => {
    await quickLook().click();
    await expect(page.getByRole('dialog', { name: NAME, exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/compendium\?/);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  await test.step('the plus adds to the coven and stays on the list', async () => {
    await plus().click();
    await expect(card().getByRole('button', { name: 'In Every Cupboard' })).toBeVisible();
    await expect.poll(async () => (await heldRows()).length).toBe(1);
    await expect(page).toHaveURL(/\/compendium\?/);
  });
});

test('on a coven’s Ingredients page, a press on a card outside its name opens its entry, and its stock controls and Quick Look keep their own actions', async ({
  page,
}) => {
  const NAME = 'Fixture Pressroot';
  const coven = await seedCoven(page, 'Fixture Coven Press', 'card-click-coven.test', {
    A: 'owner',
  });
  const held = await withSql(async (sql) => {
    const own = await localIngredient(sql, coven.id, coven.users.A, {
      name: NAME,
      canonicalName: FORMAL,
      variants: [makeVariant({ form: 'Root' })],
    });
    // Under its threshold, so the jar line carries the Low Stock badge.
    await insertStock(sql, coven.id, own, { quantity: 5, unit: 'g', threshold: 10 }, coven.users.A);
    return own;
  });
  const listPath = `/coven/${coven.slug}/ingredients`;
  const entryPath = new RegExp(`/coven/${coven.slug}/ingredients/${held.ingredientId}$`);
  const card = () => rowOf(ingredientList(page), NAME);
  const stock = () => stockEditor(card(), `${NAME}, ${FORMAL}`);
  const quickLook = () =>
    card().getByRole('link', { name: `Quick Look ${NAME}, ${FORMAL}`, exact: true });
  const open = async () => {
    await page.goto(listPath);
    await expect(card()).toBeVisible();
  };

  await signInAgainAs(page, coven.users.A);
  await open();

  await test.step('the name is the card’s one link to its entry, named by the name alone', async () => {
    const href = `/coven/${coven.slug}/ingredients/${held.ingredientId}`;
    await expect(nameLink(card(), NAME)).toHaveAttribute('href', href);
    await expect(card().locator(`a[href="${href}"]`)).toHaveCount(1);
    await expect(nameLink(card(), NAME)).toHaveAccessibleName(NAME);
  });

  await test.step('every control but the name is at least 24 by 24', async () => {
    await expectTargets(card(), NAME, [lowBadge(card()), stock().open, quickLook()]);
  });

  await test.step('a press on the formal name opens the entry', async () => {
    await pressCardAt(card(), await formalPoint(card()));
    await expect(page).toHaveURL(entryPath);
  });

  await test.step('a press on the card’s empty space opens the entry', async () => {
    await open();
    await pressCardAt(card(), await blankPoint(card()));
    await expect(page).toHaveURL(entryPath);
  });

  await test.step('a press on a jar line’s words opens the entry', async () => {
    await open();
    const words = card().locator('.specimen__stock li > span').first();
    await expect(words).toContainText('5 g');
    await pressCardAt(card(), await middleOf(card(), words));
    await expect(page).toHaveURL(entryPath);
  });

  await test.step('a press between the foot’s controls opens the entry', async () => {
    await open();
    await pressCardAt(card(), await gapAfter(card(), quickLook()));
    await expect(page).toHaveURL(entryPath);
  });

  await test.step('Edit Stock opens its dialog over the list', async () => {
    await open();
    await stock().open.click();
    await expect(stock().dialog).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${listPath}$`));
    await stock().cancel.click();
    await expect(stock().dialog).toHaveCount(0);
  });

  await test.step('the Low Stock badge takes the press itself and stays on the list', async () => {
    await lowBadge(card()).click();
    await expect(lowBadge(card())).toBeFocused();
    await expect(page).toHaveURL(new RegExp(`${listPath}$`));
  });

  await test.step('Quick Look opens the details over the list, not the entry', async () => {
    await quickLook().click();
    await expect(page.getByRole('dialog', { name: NAME, exact: true })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${listPath}\\?`));
  });
});
