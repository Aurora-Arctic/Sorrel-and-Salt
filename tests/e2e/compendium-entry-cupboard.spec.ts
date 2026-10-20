import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAgainAs, signInAs } from './session';
import { seedCoven, withSql } from './stories/coven-ingredients';
import { insertIngredient } from '../support/db/insert-ingredient';
import { makeIngredient } from '../support/fixtures/ingredient';

// The coven's cupboard choices on the public entry page (M9.12, first PR): a member of one coven
// adds the entry there with Add to Cupboard, and the title's row then offers the Edit menu the
// coven's own copy of the page offers; a Remove from it leaves the viewer on the public page.
// A viewer is offered nothing. A member of two covens chooses which from Add to Cupboard's menu,
// and once one holds the entry, Add to Cupboard inside the Edit menu asks for the other in a
// dialog. Which coven the other choices ask for is the component's tests'
// (tests/components/IngredientEntry/public-cupboard-actions.test.tsx), and the plus on the cards
// is compendium-add.spec.ts's.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const ADD = 'Add to Cupboard';
const NAME = 'Fixture Shelfwort';

test('a member adds the entry from its public page, and the Edit menu then offers its removal', async ({
  page,
  browser,
  baseURL,
}) => {
  const coven = await seedCoven(page, 'Fixture Coven Shelf', 'entry-cupboard.test', {
    A: 'owner',
    B: 'member',
    C: 'viewer',
  });
  const admin = await browser.newPage({ baseURL });
  try {
    const { userId } = await signInAs(admin, 'admin@entry-cupboard.test', ['discord'], 'admin');
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
  const [{ slug }] = await withSql(
    (sql) => sql<{ slug: string }[]>`
      select slug from ingredients
      where name = ${NAME} and workspace_id is null and deleted_at is null`,
  );
  const address = `/compendium/ingredients/${slug}`;
  const heldRows = () =>
    withSql(
      (sql) => sql<{ id: string }[]>`
        select e.id from workspace_compendium_entries e
        join ingredients i on i.id = e.ingredient_id
        where e.workspace_id = ${coven.id} and i.name = ${NAME} and e.deleted_at is null`,
    );
  const open = async () => {
    await page.goto(address);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(NAME);
  };
  const add = () => page.getByRole('button', { name: ADD });
  const menu = () => page.getByRole('button', { name: `Edit ${NAME}`, exact: true });

  // Why the add is this test's: the entry is live and public, and the coven does not hold it.
  expect(await heldRows()).toHaveLength(0);

  await test.step('a viewer is offered no cupboard choice', async () => {
    await signInAgainAs(page, coven.users.C);
    await open();
    await expect(add()).toHaveCount(0);
    await expect(menu()).toHaveCount(0);
  });

  await test.step('the member presses Add to Cupboard, and the Edit menu takes its place', async () => {
    await signInAgainAs(page, coven.users.B);
    await open();
    await expect(menu()).toHaveCount(0);
    await add().click();
    await expect(menu()).toBeVisible();
    await expect(add()).toHaveCount(0);
    expect(await heldRows()).toHaveLength(1);
    await assertNoAccessibilityViolations(page);
  });

  await test.step('the menu offers what the coven’s copy offers, and stays after a reload', async () => {
    await open();
    await menu().click();
    for (const choice of ['Annotate', 'Make It Ours', 'Remove']) {
      await expect(page.getByRole('menuitem', { name: choice })).toBeVisible();
    }
    await page.keyboard.press('Escape');
  });

  await test.step('Remove asks, removes the coven’s entry, and leaves the member on this page', async () => {
    await menu().click();
    await page.getByRole('menuitem', { name: 'Remove' }).click();
    const dialog = page.getByRole('dialog', { name: 'Remove from Cupboard' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(add()).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${address}$`));
    expect(await heldRows()).toHaveLength(0);
  });
});

// Add to Cupboard alone, with two covens that may add, is a menu of them, adding to the one
// chosen at once (M9.12, the owner's call, 2026-10-20); a coven holding the entry would be shown
// there disabled, which the component test proves, since here the holder's owner role brings the
// Edit menu instead. Once that coven holds it, Add to
// Cupboard is one choice in the Edit menu, and asks for the other coven in a dialog, the held
// one listed but not choosable.
test('a member of two covens chooses from Add to Cupboard’s menu, then adds to the other from the Edit menu’s dialog', async ({
  page,
  browser,
  baseURL,
}) => {
  const NAME_TWO = 'Fixture Pantrywort';
  const FIRST = 'Fixture Coven Pantry One';
  const SECOND = 'Fixture Coven Pantry Two';
  const one = await seedCoven(page, FIRST, 'entry-cupboard-pick.test', {
    A: 'owner',
    B: 'member',
  });
  // B joins a second coven that B owns: a setup row, stamped by B as the seed helper stamps.
  const second = await withSql((sql) =>
    sql.begin(async (tx) => {
      const by = one.users.B;
      await tx`select set_config('app.current_user_id', ${by}, true)`;
      const [workspace] = await tx<{ id: string }[]>`
        insert into workspaces (name, slug, created_by, updated_by)
        values (${SECOND}, 'fixture-coven-pantry-two', ${by}, ${by})
        returning id`;
      await tx`
        insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
        values (${workspace.id}, ${by}, 'owner', ${by}, ${by})`;
      return workspace.id;
    }),
  );
  const admin = await browser.newPage({ baseURL });
  try {
    const { userId } = await signInAs(
      admin,
      'admin@entry-cupboard-pick.test',
      ['discord'],
      'admin',
    );
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
  const [{ slug }] = await withSql(
    (sql) => sql<{ slug: string }[]>`
      select slug from ingredients
      where name = ${NAME_TWO} and workspace_id is null and deleted_at is null`,
  );
  const heldRows = (workspaceId: string) =>
    withSql(
      (sql) => sql<{ id: string }[]>`
        select e.id from workspace_compendium_entries e
        join ingredients i on i.id = e.ingredient_id
        where e.workspace_id = ${workspaceId} and i.name = ${NAME_TWO} and e.deleted_at is null`,
    );
  const add = () => page.getByRole('button', { name: ADD });
  const addMenu = page.getByRole('menu', { name: ADD });
  const edit = () => page.getByRole('button', { name: `Edit ${NAME_TWO}`, exact: true });

  // Why the menu is this test's: B may write in both, and neither coven holds the entry.
  expect(await heldRows(one.id)).toHaveLength(0);
  expect(await heldRows(second)).toHaveLength(0);

  await signInAgainAs(page, one.users.B);
  await page.goto(`/compendium/ingredients/${slug}`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(NAME_TWO);

  await test.step('Add to Cupboard opens a menu of both covens instead of adding', async () => {
    await add().click();
    await expect(addMenu).toBeVisible();
    await expect(addMenu.getByRole('menuitem')).toHaveText([FIRST, SECOND]);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await heldRows(one.id)).toHaveLength(0);
    await assertNoAccessibilityViolations(page);
  });

  await test.step('choosing the second coven adds there alone, and the Edit menu takes its place', async () => {
    await addMenu.getByRole('menuitem', { name: SECOND }).click();
    await expect(edit()).toBeVisible();
    await expect(add()).toHaveCount(0);
    expect(await heldRows(second)).toHaveLength(1);
    expect(await heldRows(one.id)).toHaveLength(0);
  });

  await test.step('Add to Cupboard in the Edit menu asks for the first coven in a dialog, and adds there', async () => {
    await edit().click();
    await page.getByRole('menuitem', { name: ADD }).click();
    const dialog = page.getByRole('dialog', { name: ADD });
    await expect(dialog).toBeVisible();
    const picker = dialog.getByRole('combobox', { name: 'Coven' });
    await expect(picker).toHaveText(FIRST);
    await picker.click();
    const held = dialog.getByRole('option', { name: new RegExp(`^${SECOND}`) });
    await expect(held).toHaveAttribute('aria-disabled', 'true');
    await expect(held).toContainText('Already in My Ingredients');
    await assertNoAccessibilityViolations(page);
    await picker.press('Escape');
    await dialog.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect.poll(async () => (await heldRows(one.id)).length).toBe(1);
    await edit().click();
    await expect(page.getByRole('menuitem', { name: ADD })).toHaveCount(0);
  });
});
