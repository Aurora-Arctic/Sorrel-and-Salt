import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAgainAs, signInAs } from './session';
import { seedCoven, withSql } from './stories/coven-ingredients';
import { ADD, HELD as EVERY, HELD_MARK, SHELF } from '../support/cupboard-wording';
import { insertIngredient } from '../support/db/insert-ingredient';
import { makeIngredient } from '../support/fixtures/ingredient';
import { insertWorkspace } from '../support/db/insert-workspace';

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const NAME = 'Fixture Shelfwort';
// Role names match in part: HELD keeps the colon so it finds only the check, never the shelf (SHELF, matched exactly).
const HELD = `${EVERY}:`;

test('a member adds the entry from its public page, and the three dots then offer its removal', async ({
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
  const add = () => page.getByRole('main').getByRole('button', { name: ADD });
  const menu = () => page.getByRole('button', { name: `More for ${NAME}`, exact: true });
  const bin = () => page.getByRole('button', { name: `Remove ${NAME}`, exact: true });
  const remove = () => page.getByRole('menuitem', { name: 'Remove', exact: true });
  const shelf = () => page.getByRole('button', { name: SHELF, exact: true });
  const check = () => page.getByRole('main').getByRole('button', { name: HELD });

  // Why the add is this test's: the entry is live and public, and the coven does not hold it.
  expect(await heldRows()).toHaveLength(0);

  await test.step('a viewer is offered no cupboard choice, and no shelf while nothing holds it', async () => {
    await signInAgainAs(page, coven.users.C);
    await open();
    await expect(add()).toHaveCount(0);
    await expect(menu()).toHaveCount(0);
    await expect(bin()).toHaveCount(0);
    await expect(shelf()).toHaveCount(0);
  });

  await test.step('the member presses the plus, which adds at once, and the three dots and the shelf come, with no bin beside them', async () => {
    await signInAgainAs(page, coven.users.B);
    await open();
    await expect(menu()).toHaveCount(0);
    await expect(shelf()).toHaveCount(0);
    await add().click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Added to Fixture Coven Shelf.' }),
    ).toHaveCount(1);
    await expect(menu()).toBeVisible();
    await expect(bin()).toHaveCount(0);
    await expect(add()).toHaveCount(0);
    await expect(check()).toBeVisible();
    await expect(shelf()).toBeVisible();
    expect(await heldRows()).toHaveLength(1);
    // Sweep gap: the public entry page after a member adds it, with the check shown.
    await assertNoAccessibilityViolations(page);
  });

  await test.step('the menu offers what the coven’s copy offers, Add not among them, and stays after a reload', async () => {
    await open();
    await menu().click();
    await expect(page.getByRole('menuitem')).toHaveText([
      'Edit Stock',
      'Annotate',
      'Make It Ours',
      'Remove',
    ]);
    await page.keyboard.press('Escape');
  });

  await test.step('the coven’s own page of the entry offers Edit Stock first in its dots, opening this coven’s dialog at once', async () => {
    const [{ id }] = await withSql(
      (sql) => sql<{ id: string }[]>`
        select id from ingredients where name = ${NAME} and workspace_id is null and deleted_at is null`,
    );
    const own = `/coven/${coven.slug}/ingredients/${id}`;
    await page.goto(own);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(NAME);
    await menu().click();
    await expect(page.getByRole('menuitem').first()).toHaveText('Edit Stock');
    await page.getByRole('menuitem', { name: 'Edit Stock', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: /^Edit Stock/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('combobox', { name: 'Coven' })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await open();
  });

  await test.step('the viewer now sees the shelf, and a visitor never does', async () => {
    const visitor = await browser.newPage({ baseURL });
    try {
      await visitor.goto(address);
      await expect(visitor.getByRole('heading', { level: 1 })).toContainText(NAME);
      await expect(visitor.getByRole('button', { name: SHELF, exact: true })).toHaveCount(0);
      await expect(visitor.getByRole('main').getByRole('button', { name: ADD })).toHaveCount(0);
    } finally {
      await visitor.close();
    }
    await signInAgainAs(page, coven.users.C);
    await open();
    await expect(shelf()).toBeVisible();
    await expect(add()).toHaveCount(0);
    await expect(check()).toHaveCount(0);
    await signInAgainAs(page, coven.users.B);
    await open();
  });

  await test.step('Remove asks, removes the coven’s entry, and leaves the member on this page', async () => {
    await menu().click();
    await remove().click();
    const dialog = page.getByRole('alertdialog', { name: 'Remove from Cupboard' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(add()).toBeVisible();
    await expect(shelf()).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`${address}$`));
    expect(await heldRows()).toHaveLength(0);
  });
});

test('a member of two covens chooses from the plus’s menu, the holding coven then disabled there', async ({
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
      return insertWorkspace(tx, SECOND, [[by, 'owner']], {
        slug: 'fixture-coven-pantry-two',
        author: by,
      });
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
  const [{ id: ingredientId, slug }] = await withSql(
    (sql) => sql<{ id: string; slug: string }[]>`
      select id, slug from ingredients
      where name = ${NAME_TWO} and workspace_id is null and deleted_at is null`,
  );
  const heldRows = (workspaceId: string) =>
    withSql(
      (sql) => sql<{ id: string }[]>`
        select e.id from workspace_compendium_entries e
        join ingredients i on i.id = e.ingredient_id
        where e.workspace_id = ${workspaceId} and i.name = ${NAME_TWO} and e.deleted_at is null`,
    );
  const add = () => page.getByRole('main').getByRole('button', { name: ADD });
  const addMenu = page.getByRole('menu', { name: ADD });
  const shelf = () => page.getByRole('button', { name: SHELF, exact: true });
  const edit = () => page.getByRole('button', { name: `More for ${NAME_TWO}`, exact: true });

  // Why the menu is this test's: B may write in both, and neither coven holds the entry.
  expect(await heldRows(one.id)).toHaveLength(0);
  expect(await heldRows(second)).toHaveLength(0);

  await signInAgainAs(page, one.users.B);
  await page.goto(`/compendium/ingredients/${slug}`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(NAME_TWO);

  await test.step('the plus opens a menu of both covens instead of adding', async () => {
    await expect(shelf()).toHaveCount(0);
    await add().click();
    await expect(addMenu).toBeVisible();
    await expect(addMenu.getByRole('menuitem')).toHaveText([FIRST, SECOND]);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await heldRows(one.id)).toHaveLength(0);
    // Sweep gap: the plus menu open, listing the member's two covens.
    await assertNoAccessibilityViolations(page);
  });

  await test.step('choosing the second coven adds there alone; the three dots come, with no Add in them', async () => {
    await addMenu.getByRole('menuitem', { name: SECOND }).click();
    await expect(edit()).toBeVisible();
    await expect(shelf()).toBeVisible();
    expect(await heldRows(second)).toHaveLength(1);
    expect(await heldRows(one.id)).toHaveLength(0);
    await edit().click();
    await expect(page.getByRole('menuitem', { name: /^Add/ })).toHaveCount(0);
    await page.keyboard.press('Escape');
  });

  await test.step('the first coven’s own page of the entry has the plus too, its holder disabled', async () => {
    await page.goto(`/coven/${one.slug}/ingredients/${ingredientId}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(NAME_TWO);
    await add().click();
    await expect(addMenu.getByRole('menuitem')).toHaveCount(2);
    await expect(addMenu.getByRole('menuitem', { name: FIRST })).toBeEnabled();
    await expect(addMenu.getByRole('menuitem', { name: SECOND })).toBeDisabled();
    await page.keyboard.press('Escape');
    await page.goto(`/compendium/ingredients/${slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(NAME_TWO);
  });

  await test.step('the plus stays for the first coven, the second disabled in its menu, and adds there', async () => {
    await add().click();
    const held = addMenu.getByRole('menuitem', { name: SECOND });
    await expect(held).toBeDisabled();
    await expect(held).toHaveAccessibleName(`${SECOND}, ${HELD_MARK}`);
    await addMenu.getByRole('menuitem', { name: FIRST }).click();
    await expect.poll(async () => (await heldRows(one.id)).length).toBe(1);
    await expect(add()).toHaveCount(0);
    await expect(page.getByRole('main').getByRole('button', { name: HELD })).toBeVisible();
  });

  await test.step('the coven’s own page of the entry shows the check as well', async () => {
    await page.goto(`/coven/${one.slug}/ingredients/${ingredientId}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(NAME_TWO);
    await expect(add()).toHaveCount(0);
    await expect(page.getByRole('main').getByRole('button', { name: HELD })).toBeVisible();
    // Sweep gap: a coven's own entry page with the held check shown.
    await assertNoAccessibilityViolations(page);
  });
});

test('the Quick Look window has the plus, then the check, on a compendium list for a member only', async ({
  page,
  browser,
  baseURL,
}) => {
  const NAME_LOOK = 'Fixture Lookshelfwort';
  const coven = await seedCoven(page, 'Fixture Coven Quick Look', 'entry-cupboard-look.test', {
    A: 'owner',
    B: 'member',
    C: 'viewer',
  });
  const admin = await browser.newPage({ baseURL });
  let adminId: string;
  try {
    ({ userId: adminId } = await signInAs(
      admin,
      'admin@entry-cupboard-look.test',
      ['discord'],
      'admin',
    ));
    await withSql((sql) =>
      insertIngredient(
        sql,
        makeIngredient({ name: NAME_LOOK, canonicalName: null, nomenclature: 'none' }),
        adminId,
      ),
    );
    const [{ id, slug }] = await withSql(
      (sql) => sql<{ id: string; slug: string }[]>`
        select id, slug from ingredients
        where name = ${NAME_LOOK} and workspace_id is null and deleted_at is null`,
    );
    // The admin list names an entry by slug, the public and coven lists by id.
    const look = (path: string, by = id) => `${path}${path.includes('?') ? '&' : '?'}entry=${by}`;
    const publicList = `/compendium?query=${encodeURIComponent(NAME_LOOK)}`;
    const details = () => page.getByRole('dialog', { name: NAME_LOOK, exact: true });
    const add = () => details().getByRole('button', { name: ADD });
    const check = () => details().getByRole('button', { name: HELD });
    const opened = async (path: string, by = id) => {
      await page.goto(look(path, by));
      await expect(details()).toBeVisible();
      // Why a missing plus is not a window still loading: the pencil or the page link is there.
      await expect(
        details().getByRole('link', { name: /^See in (Compendium|Your Cupboard)$/ }),
      ).toBeVisible();
    };

    await test.step('a visitor gets neither', async () => {
      await page.context().clearCookies();
      await opened(publicList);
      await expect(page.getByRole('banner').getByRole('link', { name: 'Sign In' })).toBeVisible();
      await expect(add()).toHaveCount(0);
      await expect(check()).toHaveCount(0);
    });

    await test.step('a viewer, who may add nowhere, gets neither', async () => {
      await signInAgainAs(page, coven.users.C);
      await opened(publicList);
      await expect(add()).toHaveCount(0);
      await expect(check()).toHaveCount(0);
    });

    await test.step('a site keeper in no coven gets neither on the admin list', async () => {
      await signInAgainAs(page, adminId);
      await opened(`/curator/compendium?query=${encodeURIComponent(NAME_LOOK)}`, slug);
      await expect(add()).toHaveCount(0);
      await expect(check()).toHaveCount(0);
    });

    await test.step('a member gets the plus, which adds at once and gives way to the check', async () => {
      await signInAgainAs(page, coven.users.B);
      await opened(publicList);
      // Why the plus is the answer: the coven does not hold the entry yet.
      await expect(check()).toHaveCount(0);
      await add().click();
      await expect(
        page.getByRole('status').filter({ hasText: 'Added to Fixture Coven Quick Look.' }),
      ).toHaveCount(1);
      await expect(add()).toHaveCount(0);
      await expect(check()).toBeVisible();
      // Sweep gap: Quick Look on the compendium list with the check shown after adding.
      await assertNoAccessibilityViolations(page);
    });

    await test.step('the coven’s own list opens the window of its card: Annotate, and no plus or check', async () => {
      await opened(`/coven/${coven.slug}/ingredients?query=${encodeURIComponent(NAME_LOOK)}`);
      await expect(add()).toHaveCount(0);
      await expect(check()).toHaveCount(0);
      await expect(details().getByRole('link', { name: `Annotate ${NAME_LOOK}` })).toBeVisible();
    });
  } finally {
    await admin.close();
  }
});
