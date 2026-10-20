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
// A viewer is offered nothing. Which coven is asked where several permit a choice is the
// component's tests' (tests/components/IngredientEntry/public-cupboard-actions.test.tsx), and
// the plus on the cards is compendium-add.spec.ts's.

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
  const menu = () => page.getByRole('button', { name: 'Edit', exact: true });

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
