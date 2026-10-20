import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAgainAs, signInAs } from './session';
import { seedCoven, withSql } from './stories/coven-ingredients';
import { insertIngredient } from '../support/db/insert-ingredient';
import { makeIngredient } from '../support/fixtures/ingredient';

// The coven's cupboard choices on the public entry page (M9.12): a member of one coven adds the
// entry there with the plus beside the pencil, the card's plus, and the pencil's Edit menu then
// offers what the coven's own copy of the page offers, Add never among them; a Remove from it
// leaves the viewer on the public page. A viewer is offered nothing. The In Your Cupboard shelf
// before the name shows whoever's coven holds the entry, a viewer's included, and no visitor or
// member whose covens do not. A member of two covens chooses which from the plus's menu, the
// holding coven shown there disabled, on the public page and a coven's own page of the entry
// alike; once every coven holds it, the card's check stands in the plus's place. Which coven the other choices ask for is the component's
// tests' (tests/components/IngredientEntry/public-cupboard-actions.test.tsx), and the plus on the
// cards is compendium-add.spec.ts's.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const ADD = 'Add to My Ingredients';
const SHELF = 'In Your Cupboard';
// What a held coven's check in the plus's menu stands for, joined to its name.
const HELD_MARK = 'in My Ingredients';
const NAME = 'Fixture Shelfwort';
const HELD = 'In My Ingredients';

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
  const add = () => page.getByRole('main').getByRole('button', { name: ADD });
  const menu = () => page.getByRole('button', { name: `Edit ${NAME}`, exact: true });
  const shelf = () => page.getByRole('button', { name: SHELF });
  const check = () => page.getByRole('main').getByRole('img', { name: HELD });

  // Why the add is this test's: the entry is live and public, and the coven does not hold it.
  expect(await heldRows()).toHaveLength(0);

  await test.step('a viewer is offered no cupboard choice, and no shelf while nothing holds it', async () => {
    await signInAgainAs(page, coven.users.C);
    await open();
    await expect(add()).toHaveCount(0);
    await expect(menu()).toHaveCount(0);
    await expect(shelf()).toHaveCount(0);
  });

  await test.step('the member presses the plus, which adds at once, and the Edit menu and the shelf come', async () => {
    await signInAgainAs(page, coven.users.B);
    await open();
    await expect(menu()).toHaveCount(0);
    await expect(shelf()).toHaveCount(0);
    await add().click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Added to Fixture Coven Shelf.' }),
    ).toHaveCount(1);
    await expect(menu()).toBeVisible();
    // Every coven of the member's holds it now, so the card's check stands where the plus was
    // (the owner's call, 2026-10-20).
    await expect(add()).toHaveCount(0);
    await expect(check()).toBeVisible();
    await expect(shelf()).toBeVisible();
    expect(await heldRows()).toHaveLength(1);
    await assertNoAccessibilityViolations(page);
  });

  await test.step('the menu offers what the coven’s copy offers, Add not among them, and stays after a reload', async () => {
    await open();
    await menu().click();
    await expect(page.getByRole('menuitem')).toHaveText(['Annotate', 'Make It Ours', 'Remove']);
    await page.keyboard.press('Escape');
  });

  await test.step('the viewer now sees the shelf, and a visitor never does', async () => {
    const visitor = await browser.newPage({ baseURL });
    try {
      await visitor.goto(address);
      await expect(visitor.getByRole('heading', { level: 1 })).toContainText(NAME);
      await expect(visitor.getByRole('button', { name: SHELF })).toHaveCount(0);
      await expect(visitor.getByRole('main').getByRole('button', { name: ADD })).toHaveCount(0);
    } finally {
      await visitor.close();
    }
    await signInAgainAs(page, coven.users.C);
    await open();
    await expect(shelf()).toBeVisible();
    await expect(add()).toHaveCount(0);
    // A viewer may add nowhere, so no check either.
    await expect(check()).toHaveCount(0);
    await signInAgainAs(page, coven.users.B);
    await open();
  });

  await test.step('Remove asks, removes the coven’s entry, and leaves the member on this page', async () => {
    await menu().click();
    await page.getByRole('menuitem', { name: 'Remove' }).click();
    const dialog = page.getByRole('dialog', { name: 'Remove from Cupboard' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(add()).toBeVisible();
    await expect(shelf()).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`${address}$`));
    expect(await heldRows()).toHaveLength(0);
  });
});

// With two covens that may add, the plus is a menu of them, adding to the one chosen at once
// (M9.12, the owner's call, 2026-10-20), and a coven that holds the entry is listed there
// disabled. Add is never in the pencil's Edit menu here: the plus is where it is.
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
  const shelf = () => page.getByRole('button', { name: SHELF });
  const edit = () => page.getByRole('button', { name: `Edit ${NAME_TWO}`, exact: true });

  // Why the menu is this test's: B may write in both, and neither coven holds the entry.
  expect(await heldRows(one.id)).toHaveLength(0);
  expect(await heldRows(second)).toHaveLength(0);

  await signInAgainAs(page, one.users.B);
  await page.goto(`/compendium/ingredients/${slug}`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(NAME_TWO);

  await test.step('the plus opens a menu of both covens instead of adding', async () => {
    // A member whose covens hold none of it sees no shelf.
    await expect(shelf()).toHaveCount(0);
    await add().click();
    await expect(addMenu).toBeVisible();
    await expect(addMenu.getByRole('menuitem')).toHaveText([FIRST, SECOND]);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await heldRows(one.id)).toHaveLength(0);
    await assertNoAccessibilityViolations(page);
  });

  await test.step('choosing the second coven adds there alone; the Edit menu comes, with no Add in it', async () => {
    await addMenu.getByRole('menuitem', { name: SECOND }).click();
    await expect(edit()).toBeVisible();
    await expect(shelf()).toBeVisible();
    expect(await heldRows(second)).toHaveLength(1);
    expect(await heldRows(one.id)).toHaveLength(0);
    await edit().click();
    await expect(page.getByRole('menuitem', { name: /^Add/ })).toHaveCount(0);
    await page.keyboard.press('Escape');
  });

  await test.step('the first coven’s own page of the entry has the plus too, its holder disabled (the owner’s call, 2026-10-20)', async () => {
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
    await assertNoAccessibilityViolations(page);
    await addMenu.getByRole('menuitem', { name: FIRST }).click();
    await expect.poll(async () => (await heldRows(one.id)).length).toBe(1);
    // Both hold it now: the card's check in the plus's place (the owner's call, 2026-10-20).
    await expect(add()).toHaveCount(0);
    await expect(page.getByRole('main').getByRole('img', { name: HELD })).toBeVisible();
  });

  await test.step('the coven’s own page of the entry shows the check as well', async () => {
    await page.goto(`/coven/${one.slug}/ingredients/${ingredientId}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(NAME_TWO);
    await expect(add()).toHaveCount(0);
    await expect(page.getByRole('main').getByRole('img', { name: HELD })).toBeVisible();
    await assertNoAccessibilityViolations(page);
  });
});

// The Quick Look window carries the same plus and check beside its pencil (M9.12; the owner's
// calls, 2026-10-20): on the public compendium a visitor and a viewer get neither, a member the
// plus until the coven holds the entry and the check after, and the coven's own list and the
// admin list follow the same rule.
test('the Quick Look window has the plus, then the check, for a member only', async ({
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
    const details = () =>
      page.getByRole('dialog', { name: `Ingredient, ${NAME_LOOK}`, exact: true });
    const add = () => details().getByRole('button', { name: ADD });
    const check = () => details().getByRole('img', { name: HELD });
    const opened = async (path: string, by = id) => {
      await page.goto(look(path, by));
      await expect(details()).toBeVisible();
      // Why a missing plus is not a window still loading: the pencil or View Page is there.
      await expect(details().getByRole('link', { name: 'View Page' })).toBeVisible();
    };

    await test.step('a visitor gets neither', async () => {
      await page.context().setExtraHTTPHeaders({});
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

    await test.step('a site admin in no coven gets neither on the admin list', async () => {
      await signInAgainAs(page, adminId);
      await opened(`/admin/compendium?query=${encodeURIComponent(NAME_LOOK)}`, slug);
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
      await assertNoAccessibilityViolations(page);
    });

    await test.step('the coven’s own list shows the check for the held entry, on a reload as well', async () => {
      await opened(`/coven/${coven.slug}/ingredients?query=${encodeURIComponent(NAME_LOOK)}`);
      await expect(add()).toHaveCount(0);
      await expect(check()).toBeVisible();
    });
  } finally {
    await admin.close();
  }
});
