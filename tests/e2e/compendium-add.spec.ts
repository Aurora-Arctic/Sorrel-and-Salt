import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAgainAs, signInAs } from './session';
import {
  compendiumList,
  ingredientList,
  rowOf,
  seedCoven,
  withSql,
} from './stories/coven-ingredients';
import { insertIngredient } from '../support/db/insert-ingredient';
import { makeIngredient } from '../support/fixtures/ingredient';

// The plus and the check on the public compendium's cards (M9.12, first PR): a member adds an
// entry to their coven in one press, the card then shows the check, a status mark and no link,
// and the coven's list shows the entry. The page asks the coven alone: another coven's member sees
// the same entry unheld, and a viewer is offered neither mark.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const ADD = 'Add to My Ingredients';
const HELD = 'In All Covens';
const NAME = 'Fixture Holdwort';

test('a member adds a compendium entry with the plus, the check shows, and the coven’s list shows it', async ({
  page,
  browser,
  baseURL,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Add', 'compendium-add.test', {
    A: 'owner',
    B: 'member',
    C: 'viewer',
  });
  const elsewhere = await seedCoven(page, 'Fixture Coven Elsewhere Add', 'compendium-add-x.test', {
    D: 'owner',
  });
  const admin = await browser.newPage({ baseURL });
  try {
    const { userId } = await signInAs(admin, 'admin@compendium-add.test', ['discord'], 'admin');
    await withSql((sql) =>
      insertIngredient(
        sql,
        makeIngredient({ name: NAME, canonicalName: null, nomenclature: 'none' }),
        userId,
      ),
    );
  } finally {
    await admin.close();
  }
  const heldRows = (workspaceId: string) =>
    withSql(
      (sql) => sql<{ id: string }[]>`
        select e.id from workspace_compendium_entries e
        join ingredients i on i.id = e.ingredient_id
        where e.workspace_id = ${workspaceId} and i.name = ${NAME} and e.deleted_at is null`,
    );
  const card = (target: typeof page) => {
    const found = rowOf(compendiumList(target), NAME);
    return found;
  };
  const open = async (target: typeof page) => {
    await target.goto(`/compendium?query=${encodeURIComponent(NAME)}`);
    await expect(card(target)).toBeVisible();
  };

  // Why the add is this test's: the entry is live and public, and neither coven holds it.
  expect(await heldRows(coven.id)).toHaveLength(0);
  expect(await heldRows(elsewhere.id)).toHaveLength(0);

  await test.step('a viewer is offered neither the plus nor the check', async () => {
    await signInAgainAs(page, coven.users.C);
    await open(page);
    await expect(card(page).getByRole('button', { name: ADD })).toHaveCount(0);
    await expect(card(page).getByRole('button', { name: HELD })).toHaveCount(0);
  });

  await test.step('the member presses the plus and the card shows the check in its place', async () => {
    await signInAgainAs(page, coven.users.B);
    await open(page);
    await expect(card(page).getByRole('button', { name: HELD })).toHaveCount(0);
    await card(page).getByRole('button', { name: ADD }).click();
    await expect(card(page).getByRole('button', { name: HELD })).toBeVisible();
    await expect(card(page).getByRole('button', { name: ADD })).toHaveCount(0);
    expect(await heldRows(coven.id)).toHaveLength(1);
    await assertNoAccessibilityViolations(page);
  });

  // The check is a status mark, not a link (the owner’s call, 2026-10-20): the details modal’s
  // In Your Covens list carries the links.
  await test.step('the check stays after a reload, as a mark and no link, and the coven’s list shows the entry', async () => {
    await open(page);
    await expect(card(page).getByRole('button', { name: HELD })).toBeVisible();
    await expect(card(page).getByRole('link', { name: HELD })).toHaveCount(0);
    await page.goto(`/coven/${coven.slug}/ingredients?query=${encodeURIComponent(NAME)}`);
    await expect(rowOf(ingredientList(page), NAME)).toBeVisible();
  });

  await test.step('another coven’s member still sees the plus: held is the coven’s own', async () => {
    await signInAgainAs(page, elsewhere.users.D);
    await open(page);
    await expect(card(page).getByRole('button', { name: ADD })).toBeVisible();
    await expect(card(page).getByRole('button', { name: HELD })).toHaveCount(0);
    expect(await heldRows(elsewhere.id)).toHaveLength(0);
  });
});

// Someone who may write in two covens chooses which from the plus (M9.12, the owner's call,
// 2026-10-20): it is a menu of both covens by name, adding to the one chosen at once. It adds
// with no menu only where there is one coven at all, so once one coven holds the entry the plus
// is still the menu, that coven shown disabled; the card keeps the plus until both hold it.
test('a member of two covens chooses from the plus which one it adds to, and the card keeps the plus until both hold the entry', async ({
  page,
  browser,
  baseURL,
}) => {
  const NAME_TWO = 'Fixture Pickwort';
  const FIRST = 'Fixture Coven Pick One';
  const SECOND = 'Fixture Coven Pick Two';
  const one = await seedCoven(page, FIRST, 'compendium-pick.test', { A: 'owner', B: 'member' });
  // B joins a second coven that B owns: a setup row, stamped by B as the seed helper stamps.
  const second = await withSql((sql) =>
    sql.begin(async (tx) => {
      const by = one.users.B;
      await tx`select set_config('app.current_user_id', ${by}, true)`;
      const [workspace] = await tx<{ id: string }[]>`
        insert into workspaces (name, slug, created_by, updated_by)
        values (${SECOND}, 'fixture-coven-pick-two', ${by}, ${by})
        returning id`;
      await tx`
        insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
        values (${workspace.id}, ${by}, 'owner', ${by}, ${by})`;
      return workspace.id;
    }),
  );
  const admin = await browser.newPage({ baseURL });
  try {
    const { userId } = await signInAs(admin, 'admin@compendium-pick.test', ['discord'], 'admin');
    await withSql((sql) =>
      insertIngredient(
        sql,
        makeIngredient({ name: NAME_TWO, canonicalName: null, nomenclature: 'none' }),
        userId,
      ),
    );
  } finally {
    await admin.close();
  }
  const heldRows = (workspaceId: string) =>
    withSql(
      (sql) => sql<{ id: string }[]>`
        select e.id from workspace_compendium_entries e
        join ingredients i on i.id = e.ingredient_id
        where e.workspace_id = ${workspaceId} and i.name = ${NAME_TWO} and e.deleted_at is null`,
    );
  const card = () => rowOf(compendiumList(page), NAME_TWO);
  const plus = () => card().getByRole('button', { name: ADD });
  const menu = page.getByRole('menu', { name: ADD });

  // Why the menu is this test's: B may write in both, and neither coven holds the entry.
  expect(await heldRows(one.id)).toHaveLength(0);
  expect(await heldRows(second)).toHaveLength(0);

  await signInAgainAs(page, one.users.B);
  await page.goto(`/compendium?query=${encodeURIComponent(NAME_TWO)}`);
  await expect(card()).toBeVisible();

  await test.step('the plus opens a menu of both covens instead of adding', async () => {
    await plus().click();
    await expect(menu).toBeVisible();
    await expect(plus()).toHaveAttribute('aria-haspopup', 'menu');
    await expect(menu.getByRole('menuitem')).toHaveText([FIRST, SECOND]);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await heldRows(one.id)).toHaveLength(0);
    expect(await heldRows(second)).toHaveLength(0);
    await assertNoAccessibilityViolations(page);
  });

  await test.step('choosing the second coven adds there alone, and the card keeps its plus', async () => {
    await menu.getByRole('menuitem', { name: SECOND }).click();
    await expect.poll(async () => (await heldRows(second)).length).toBe(1);
    expect(await heldRows(one.id)).toHaveLength(0);
    await expect(plus()).toBeVisible();
    await expect(card().getByRole('button', { name: HELD })).toHaveCount(0);
  });

  await test.step('with the second coven holding it, the plus is still the menu, that coven disabled, and choosing the first brings the check', async () => {
    await expect(plus()).toHaveAttribute('aria-haspopup', 'menu');
    await plus().click();
    await expect(menu).toBeVisible();
    const held = menu.getByRole('menuitem', { name: SECOND });
    await expect(held).toHaveAttribute('aria-disabled', 'true');
    await expect(held).toHaveAccessibleName(`${SECOND}, in My Ingredients`);
    await assertNoAccessibilityViolations(page);
    // Choosing the held coven does nothing: the menu stays open and no second row is written.
    // Forced, since Playwright waits on an aria-disabled element as it would on a disabled one.
    await held.click({ force: true });
    await expect(menu).toBeVisible();
    expect(await heldRows(second)).toHaveLength(1);
    await menu.getByRole('menuitem', { name: FIRST }).click();
    await expect(card().getByRole('button', { name: HELD })).toBeVisible();
    await expect(plus()).toHaveCount(0);
    await expect(menu).toHaveCount(0);
    expect(await heldRows(one.id)).toHaveLength(1);
    expect(await heldRows(second)).toHaveLength(1);
  });
});
