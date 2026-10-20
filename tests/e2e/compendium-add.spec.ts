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
// entry to their coven in one press, the card then shows the check, and the check leads to the
// coven's list filtered to the entry. The page asks the coven alone: another coven's member sees
// the same entry unheld, and a viewer is offered neither mark.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const ADD = 'Add to My Ingredients';
const HELD = 'In My Ingredients';
const NAME = 'Fixture Holdwort';

test('a member adds a compendium entry with the plus, and the check leads to the coven’s list showing it', async ({
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
    await expect(card(page).getByRole('link', { name: HELD })).toHaveCount(0);
  });

  await test.step('the member presses the plus and the card shows the check in its place', async () => {
    await signInAgainAs(page, coven.users.B);
    await open(page);
    await expect(card(page).getByRole('link', { name: HELD })).toHaveCount(0);
    await card(page).getByRole('button', { name: ADD }).click();
    await expect(card(page).getByRole('link', { name: HELD })).toBeVisible();
    await expect(card(page).getByRole('button', { name: ADD })).toHaveCount(0);
    expect(await heldRows(coven.id)).toHaveLength(1);
    await assertNoAccessibilityViolations(page);
  });

  await test.step('the check stays after a reload, and leads to the coven’s list filtered to the entry', async () => {
    await open(page);
    const check = card(page).getByRole('link', { name: HELD });
    await expect(check).toBeVisible();
    await check.click();
    await expect(page).toHaveURL(new RegExp(`/coven/${coven.slug}/ingredients\\?`));
    await expect(rowOf(ingredientList(page), NAME)).toBeVisible();
  });

  await test.step('another coven’s member still sees the plus: held is the coven’s own', async () => {
    await signInAgainAs(page, elsewhere.users.D);
    await open(page);
    await expect(card(page).getByRole('button', { name: ADD })).toBeVisible();
    await expect(card(page).getByRole('link', { name: HELD })).toHaveCount(0);
    expect(await heldRows(elsewhere.id)).toHaveLength(0);
  });
});

// Someone who may write in two covens is asked which (M9.12, the owner's call, 2026-10-20): the
// plus opens a confirm modal with a picker. A coven that already holds the entry is listed as
// held and cannot be chosen, and the card keeps the plus until both hold it.
test('a member of two covens picks which one the plus adds to, and the card keeps the plus until both hold the entry', async ({
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
  const dialog = page.getByRole('dialog', { name: ADD });
  // The covens are a dropdown (the owner's call, 2026-10-20): the box, and one coven's option once
  // it is open.
  const picker = dialog.getByRole('combobox', { name: 'Coven' });
  const coven = (name: string) => dialog.getByRole('option', { name: new RegExp(`^${name}`) });

  // Why the picker is this test's: B may write in both, and neither coven holds the entry.
  expect(await heldRows(one.id)).toHaveLength(0);
  expect(await heldRows(second)).toHaveLength(0);

  await signInAgainAs(page, one.users.B);
  await page.goto(`/compendium?query=${encodeURIComponent(NAME_TWO)}`);
  await expect(card()).toBeVisible();

  await test.step('the plus opens a picker of both covens instead of adding', async () => {
    await card().getByRole('button', { name: ADD }).click();
    await expect(dialog).toBeVisible();
    await expect(picker).toHaveText(FIRST);
    await picker.click();
    await expect(coven(FIRST)).toHaveAttribute('aria-disabled', 'false');
    await expect(coven(SECOND)).toHaveAttribute('aria-disabled', 'false');
    await expect(dialog.getByRole('button', { name: 'Add', exact: true })).toBeEnabled();
    expect(await heldRows(one.id)).toHaveLength(0);
    expect(await heldRows(second)).toHaveLength(0);
    await assertNoAccessibilityViolations(page);
  });

  await test.step('choosing the second coven adds there alone, and the card keeps its plus', async () => {
    await coven(SECOND).click();
    await expect(picker).toHaveText(SECOND);
    await dialog.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect.poll(async () => (await heldRows(second)).length).toBe(1);
    expect(await heldRows(one.id)).toHaveLength(0);
    await expect(card().getByRole('button', { name: ADD })).toBeVisible();
    await expect(card().getByRole('link', { name: HELD })).toHaveCount(0);
  });

  await test.step('the picker now shows the second coven as held, and starts on the first', async () => {
    await card().getByRole('button', { name: ADD }).click();
    await expect(dialog).toBeVisible();
    await expect(picker).toHaveText(FIRST);
    await picker.click();
    await expect(coven(SECOND)).toHaveAttribute('aria-disabled', 'true');
    await expect(coven(SECOND)).toContainText('Already in My Ingredients');
    await assertNoAccessibilityViolations(page);
    // Shut the list again, leaving the first coven chosen, so Add is in reach.
    await picker.press('Escape');
  });

  await test.step('adding to the first as well swaps the plus for the check', async () => {
    await dialog.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(card().getByRole('link', { name: HELD })).toBeVisible();
    await expect(card().getByRole('button', { name: ADD })).toHaveCount(0);
    expect(await heldRows(one.id)).toHaveLength(1);
    expect(await heldRows(second)).toHaveLength(1);
  });
});
