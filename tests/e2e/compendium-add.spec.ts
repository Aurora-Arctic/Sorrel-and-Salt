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
