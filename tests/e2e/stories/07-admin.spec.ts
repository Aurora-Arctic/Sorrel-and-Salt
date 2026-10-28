import type { Locator, Page, Request, Route as PlaywrightRoute } from '@playwright/test';
import postgres from 'postgres';
import { deitySlug, formSlug, slugify } from '@/lib/slugify';
import { insertDeityLink, insertIngredient } from '../../support/db/insert-ingredient';
import { makeIngredient, makeVariant } from '../../support/fixtures/ingredient';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll } from '../axe';
import { e2eDatabaseUrl, recreateE2eDatabase } from '../database';
import { test, expect } from '../fixtures';
import { signInAgainAs, signInAs } from '../session';

// Stories 17, 18 and 19, walked in the browser: what a site admin curates and
// how, what everyone else is refused, and what an admin does not reach — a
// coven's own pages. Setup goes straight to the database (MB.101); each
// story's own step goes through the pages a person would use.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

type Role = 'owner' | 'member' | 'viewer';

/** Runs `fn` against this worker's slot database, the one its server reads. */
async function withSql<T>(fn: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    return await fn(sql);
  } finally {
    await sql.end();
  }
}

/**
 * A coven named `name`, holding each user at the role given, the first its
 * creator, by the raw client rather than the coven service: the coven is the
 * setting here, not what is under test. Returns its slug.
 */
async function makeCoven(name: string, members: [userId: string, role: Role][]): Promise<string> {
  const slug = slugify(name);
  const [creator] = members[0];
  await withSql(async (sql) => {
    const [coven] = await sql`
      insert into workspaces (name, slug, created_by, updated_by)
      values (${name}, ${slug}, ${creator}, ${creator})
      returning id`;
    for (const [userId, role] of members) {
      await sql`
        insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
        values (${coven.id}, ${userId}, ${role}, ${creator}, ${creator})`;
    }
  });
  return slug;
}

/** The page `forbidden()` draws: a 403 at the address asked for, with none of the admin area. */
async function expectNotAuthorized(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response?.status(), path).toBe(403);
  expect(new URL(page.url()).pathname).toBe(new URL(path, page.url()).pathname);
  await expect(
    page.getByRole('main').getByRole('heading', { level: 1, name: 'Not Authorized' }),
  ).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Admin' })).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

// Every page under `/admin` (claude-docs/auth/admin-guard.md, "The admin
// guard"). A page added there joins this list.
const ADMIN_ROUTES = [
  '/admin',
  '/admin/compendium',
  '/admin/users',
  '/admin/invitations',
  '/admin/privilege-changes',
  '/admin/categories',
  '/admin/category-groups',
  '/admin/forms',
  '/admin/form-groups',
  '/admin/deities',
  '/admin/deity-traditions',
  '/admin/celestial-bodies',
  '/admin/zodiac-signs',
];

test.describe('story 17: everyone but an admin is kept from editing the compendium', () => {
  test(
    'a coven owner who is not an admin meets the 403 page on every admin page an admin opens',
    { tag: '@story-17' },
    async ({ page }) => {
      // Why each refusal below is the guard's: the same addresses answer an admin.
      await signInAs(page, 'admin@story-17.test', ['discord'], 'admin');
      for (const path of ADMIN_ROUTES) {
        const response = await page.goto(path);
        expect(response?.status(), path).toBe(200);
        await expect(page.getByRole('navigation', { name: 'Admin' })).toBeVisible();
      }

      // The highest seat a coven has, so nothing but the site role is left to refuse it.
      const { userId } = await signInAs(page, 'owner@story-17.test');
      const slug = await makeCoven('Fixture Story Seventeen Coven', [[userId, 'owner']]);
      expect((await page.goto(`/coven/${slug}`))?.status()).toBe(200);
      // The shell offers no way in.
      await expect(page.getByRole('banner').getByRole('link', { name: 'Admin' })).toHaveCount(0);

      for (const path of ADMIN_ROUTES) await expectNotAuthorized(page, path);
      // The 403 is drawn inside the shell: the bar stays, still with no way into
      // the admin area, and the site nav still leads out to the compendium.
      await expect(page.getByRole('banner')).toBeVisible();
      await expect(page.getByRole('banner').getByRole('link', { name: 'Admin' })).toHaveCount(0);
      await expect(
        page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'Compendium' }),
      ).toBeVisible();
      await assertNoSidewaysScroll(page, { restore: true });
      await assertNoAccessibilityViolations(page);
    },
  );

  test(
    'a coven owner who is not an admin finds no way to edit a compendium entry an admin edits',
    { tag: '@story-17' },
    async ({ page }) => {
      const { userId: adminId } = await signInAs(
        page,
        'editor@story-17.test',
        ['discord'],
        'admin',
      );
      // Unlike every name story 18 adds, so its own adds meet no possible-duplicate prompt.
      const name = 'Fixture Bramble Guarded';
      const slug = slugify(name);
      await withSql((sql) =>
        insertIngredient(
          sql,
          makeIngredient({ name, nomenclature: 'none', variants: [makeVariant()] }),
          adminId,
        ),
      );

      // The entry is live in the compendium, and its edit address opens it for an admin.
      await page.goto(`/admin/compendium?edit=${slug}`);
      const editing = page.getByRole('dialog', { name: `Edit Ingredient, ${name}`, exact: true });
      await expect(editing).toBeVisible();
      await expect(editing.getByRole('button', { name: 'Delete Ingredient' })).toBeVisible();

      const { userId } = await signInAs(page, 'holder@story-17.test');
      const coven = await makeCoven('Fixture Guarded Coven', [[userId, 'owner']]);
      expect((await page.goto(`/coven/${coven}`))?.status()).toBe(200);
      await expect(page.getByRole('banner').getByRole('link', { name: 'Admin' })).toHaveCount(0);

      // The edit addresses refuse a non-admin.
      await expectNotAuthorized(page, `/admin/compendium?edit=${slug}`);
      await expect(page.getByRole('textbox')).toHaveCount(0);
      await expectNotAuthorized(page, '/admin/compendium?new=ingredient-compendium');

      // The entry's public page shows the same non-admin its content and no way
      // to change it: no Edit, no Delete, anywhere on it.
      const entry = await page.goto(`/compendium/ingredients/${slug}`);
      expect(entry?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1, name, exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: /^(edit|delete)/i })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /^(edit|delete)/i })).toHaveCount(0);
      await assertNoAccessibilityViolations(page);

      // The entry is as the admin left it: it still opens, under its own name.
      await signInAgainAs(page, adminId);
      await page.goto(`/admin/compendium?edit=${slug}`);
      await expect(editing).toBeVisible();
    },
  );
});

test.describe('story 19: an admin sees a user’s covens but reaches none of them', () => {
  test(
    'an admin opens a user from the list and sees each coven they hold by name and role, linked to none',
    { tag: '@story-19' },
    async ({ page }) => {
      const email = 'holder@story-19.test';
      const { userId } = await signInAs(page, email);
      const { userId: otherId } = await signInAs(page, 'other@story-19.test');
      await makeCoven('Fixture Owned Coven', [[userId, 'owner']]);
      await makeCoven('Fixture Watched Coven', [
        [otherId, 'owner'],
        [userId, 'viewer'],
      ]);
      await signInAs(page, 'admin@story-19.test', ['google'], 'admin');

      await page.goto(`/admin/users?query=${encodeURIComponent(email)}`);
      await page
        .getByRole('row')
        .getByRole('link', { name: 'Fixture Person', exact: true })
        .click();

      // Named by its eyebrow, the user's name and their address.
      const dialog = page.getByRole('dialog', { name: new RegExp(`Fixture Person.*${email}`) });
      await expect(dialog).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`[?&]user=${userId}$`));
      const covens = dialog.getByRole('list', { name: 'Covens' });
      await expect(covens.getByRole('listitem')).toHaveCount(2);
      await expect(
        covens.getByRole('listitem').filter({ hasText: 'Fixture Owned Coven' }),
      ).toContainText('Owner');
      await expect(
        covens.getByRole('listitem').filter({ hasText: 'Fixture Watched Coven' }),
      ).toContainText('Viewer');
      // Text, never a link: an admin is no member, so the coven's page would be a 404 (below).
      await expect(covens.getByRole('link')).toHaveCount(0);
      // Impersonation is not registered in this run, so there is no Impersonate.
      await expect(dialog.getByRole('button', { name: /Impersonate/ })).toHaveCount(0);
      await assertNoAccessibilityViolations(page);

      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page).toHaveURL(/\/admin\/users\?query=[^&]*$/);
    },
  );

  // W's own pages today. Its ingredients and grimoire join this list when
  // their pages are built (M9.6's `/ingredients`, M10.11's `/grimoire`).
  const covenPages = (slug: string) => [
    `/coven/${slug}`,
    `/coven/${slug}/members`,
    `/coven/${slug}/invitations`,
  ];
  const W = 'Fixture Hearth Coven';

  for (const visitor of ['a member of another coven', 'a site admin in no coven'] as const) {
    test(
      `${visitor} meets the 404 page at each of a coven’s pages its owner opens`,
      { tag: '@story-19' },
      async ({ page }) => {
        const tag = slugify(visitor);
        const { userId: ownerId } = await signInAs(page, `owner-${tag}@story-19.test`);
        const slug = await makeCoven(`${W} ${tag}`, [[ownerId, 'owner']]);
        // Why a refusal below is the guard's: W's owner opens every one of them.
        for (const path of covenPages(slug)) {
          expect((await page.goto(path))?.status(), path).toBe(200);
          await expect(page.getByRole('navigation', { name: 'Coven' })).toBeVisible();
        }

        if (visitor === 'a member of another coven') {
          const { userId } = await signInAs(page, `visitor-${tag}@story-19.test`);
          const other = await makeCoven(`Fixture Elsewhere Coven ${tag}`, [[userId, 'member']]);
          // A live seat of their own, so the 404 is W's alone.
          expect((await page.goto(`/coven/${other}`))?.status()).toBe(200);
        } else {
          await signInAs(page, `visitor-${tag}@story-19.test`, ['discord'], 'admin');
          // An admin, as the admin area answers them.
          expect((await page.goto('/admin'))?.status()).toBe(200);
        }

        for (const path of covenPages(slug)) {
          const response = await page.goto(path);
          expect(response?.status(), path).toBe(404);
          // Nothing of the coven, in the markup or the RSC payload it carries.
          expect(await response?.text()).not.toContain(`${W} ${tag}`);
          await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
          await expect(page.getByRole('navigation', { name: 'Coven' })).toHaveCount(0);
          await assertNoAccessibilityViolations(page);
        }
      },
    );
  }
});

/**
 * Holds every request for `path` whose address carries `param` — the press's
 * navigation and any prefetch of it — until `release` is called, which lets
 * them through and resolves once the last is answered: how a test sees a
 * modal open on the press, before the page that fills it arrives (M9.18;
 * claude-docs/components/modal.md, "Opening at once").
 */
async function holdModalRequests(page: Page, path: string, param: string) {
  const held: PlaywrightRoute[] = [];
  let released = false;
  const opens = (url: URL) => url.pathname === path && url.searchParams.has(param);
  // Not `unroute` on release: it lets the held requests go itself.
  await page.route(opens, async (route) => {
    if (released) await route.continue();
    else held.push(route);
  });
  return {
    async release(): Promise<void> {
      released = true;
      const answered = held.map((route) => route.request());
      await Promise.all(held.map((route) => route.continue()));
      await Promise.all(answered.map((request: Request) => request.response()));
    },
  };
}

/** The dialog's contents marked busy: the skeleton, until the form arrives. */
const busy = (dialog: Locator) => dialog.locator('[aria-busy="true"]');

/**
 * The row naming `name`, in the list named `table` or the page's one list: a cell that is
 * exactly the name, or a link that is. An entry's name cell also holds its Quick Look link
 * (M12.5), so that cell's whole name is longer than the entry's and only its link matches.
 */
const rowOf = (page: Page, table: string | null, name: string) =>
  (table ? page.getByRole('table', { name: table, exact: true }) : page.getByRole('table'))
    .getByRole('row')
    .filter({
      has: page
        .getByRole('cell', { name, exact: true })
        .or(page.getByRole('link', { name, exact: true })),
    });

/** Presses a dialog's Delete, then the confirmation's. */
async function deleteFrom(dialog: Locator, noun: string) {
  await dialog.getByRole('button', { name: `Delete ${noun}`, exact: true }).click();
  const confirm = dialog.getByRole('button', { name: 'Delete', exact: true });
  await expect(confirm).toBeVisible();
  await confirm.click();
}

/**
 * A group's delete that moves what it holds to `destination` first: the
 * question names how many, the picker is inside it, and the move is
 * confirmed before it is made (M5.6b).
 */
async function moveAndDelete(page: Page, dialog: Locator, picker: string, destination: string) {
  await dialog.getByRole('button', { name: /^Delete (Group|Tradition)$/ }).click();
  await dialog.getByRole('combobox', { name: picker }).click();
  await dialog.getByRole('option', { name: destination, exact: true }).click();
  await dialog.getByRole('button', { name: 'Continue' }).click();
  const confirm = dialog.getByRole('button', { name: 'Move and Delete' });
  await expect(confirm).toBeVisible();
  await assertNoAccessibilityViolations(page);
  await confirm.click();
}

test.describe('story 18: an admin adds, edits and soft-deletes what the compendium is built from', () => {
  test(
    'an admin adds a compendium entry, edits it, and deletes it, the list following each',
    { tag: '@story-18' },
    async ({ page }) => {
      // A longer limit for this story alone, which is long: eight axe scans, two saves, a reload
      // and a delete. In CI, beside the other stories, it took 29.7s to 31.1s, the scans alone
      // 12s of that, and the default 30s ran out at the reloaded dialog's Close. The trace shows
      // the app quick throughout: that dialog was gone 0.4s after Close was pressed, and every
      // request answered in under 0.15s, so the time is the story's own work (MB.267).
      test.setTimeout(60_000);
      await signInAs(page, 'compendium@story-18.test', ['discord'], 'admin');
      expect((await page.goto('/admin/compendium'))?.status()).toBe(200);
      const add = page.getByRole('link', { name: 'Add Ingredient' });
      await expect(add).toBeVisible();
      await assertNoAccessibilityViolations(page);

      // Add opens its modal on the press, before the page that fills it arrives.
      const gate = await holdModalRequests(page, '/admin/compendium', 'new');
      await add.click();
      const adding = page.getByRole('dialog', { name: 'Add Ingredient' });
      await expect(adding).toBeVisible();
      await expect(adding.getByRole('status')).toHaveCount(1);
      await expect(busy(adding)).toHaveCount(1);
      await expect(page).toHaveURL(/\/admin\/compendium$/);
      await gate.release();
      await expect(page).toHaveURL(/\/admin\/compendium\?new=ingredient-compendium$/);
      const name = adding.getByRole('textbox', { name: 'Name', exact: true });
      await expect(name).toBeVisible();
      await expect(busy(adding)).toHaveCount(0);
      await assertNoAccessibilityViolations(page);

      /** Picks the curated form `form` from the New Form box, which adds it as a variant (MB.221). */
      const addForm = async (dialog: Locator, form: string) => {
        const box = dialog.getByRole('combobox', { name: 'New Form' });
        await box.click();
        await box.fill(form);
        await dialog
          .getByRole('listbox', { name: 'New Form suggestions' })
          .getByRole('option', { name: new RegExp(`^${form} \\(`) })
          .click();
        await expect(dialog.getByRole('group', { name: form, exact: true })).toBeVisible();
      };

      await name.fill('Aaa Testwort');
      await adding.getByRole('combobox', { name: 'Classification' }).click();
      await adding
        .getByRole('listbox', { name: 'Classification choices' })
        .getByRole('option', { name: 'None' })
        .click();
      await addForm(adding, 'Herb');
      await adding.getByRole('button', { name: 'Save Ingredient' }).click();

      // Save opens what it saved, at its address, under its saved name (MB.115).
      const editing = page.getByRole('dialog', {
        name: 'Edit Ingredient, Aaa Testwort',
        exact: true,
      });
      await expect(editing).toBeVisible();
      await expect(page).toHaveURL(/\/admin\/compendium\?edit=aaa-testwort$/);
      await editing.getByRole('button', { name: 'Close', exact: true }).click();
      await expect(editing).toHaveCount(0);
      // In the list, with the form it was given.
      const row = rowOf(page, null, 'Aaa Testwort');
      await expect(row.getByRole('cell', { name: 'Herb', exact: true })).toBeVisible();

      // Edited: renamed, described, and given a second form with a safety note of its own.
      await row.getByRole('link', { name: 'Edit Aaa Testwort' }).click();
      await expect(editing).toBeVisible();
      // An edit opens with every section closed (MB.115); Open All opens them.
      await editing.getByRole('button', { name: 'Open All' }).click();
      const save = editing.getByRole('button', { name: 'Save Ingredient' });
      await expect(save).toBeDisabled();
      await editing
        .getByRole('textbox', { name: 'Name', exact: true })
        .fill('Aaa Testwort Renamed');
      await editing.getByRole('textbox', { name: 'Description' }).first().fill('Made by the story');
      await addForm(editing, 'Oil');
      const oil = editing.getByRole('group', { name: 'Oil', exact: true });
      await oil.getByRole('textbox', { name: 'Safety Notes' }).fill('Dilute before use.');
      await expect(save).toBeEnabled();
      await assertNoAccessibilityViolations(page);
      await save.click();
      const renamed = page.getByRole('dialog', {
        name: 'Edit Ingredient, Aaa Testwort Renamed',
        exact: true,
      });
      await expect(renamed.getByRole('button', { name: 'Save Ingredient' })).toBeDisabled();
      await expect(
        renamed.getByRole('status').filter({ hasText: 'Aaa Testwort Renamed' }),
      ).toBeVisible();

      // Read back from the server: the new name, both forms, the oil's note its own.
      await page.reload();
      await expect(renamed).toBeFocused();
      await renamed.getByRole('button', { name: 'Variants', exact: true }).click();
      await expect(renamed.getByRole('group', { name: 'Herb', exact: true })).toBeVisible();
      await renamed.getByRole('button', { name: 'Edit Oil' }).click();
      const reopenedOil = renamed.getByRole('group', { name: 'Oil', exact: true });
      await reopenedOil.getByRole('button', { name: 'Details & Care', exact: true }).click();
      await expect(reopenedOil.getByRole('textbox', { name: 'Safety Notes' })).toHaveValue(
        'Dilute before use.',
      );
      await assertNoAccessibilityViolations(page);
      await renamed.getByRole('button', { name: 'Close', exact: true }).click();
      await expect(renamed).toHaveCount(0);
      const renamedRow = rowOf(page, null, 'Aaa Testwort Renamed');
      await expect(renamedRow.getByRole('cell', { name: 'Herb, Oil', exact: true })).toBeVisible();
      await expect(rowOf(page, null, 'Aaa Testwort')).toHaveCount(0);

      // Deleted: the modal closes onto the list, which no longer holds it.
      await renamedRow.getByRole('link', { name: 'Edit Aaa Testwort Renamed' }).click();
      await expect(renamed).toBeVisible();
      await deleteFrom(renamed, 'Ingredient');
      await expect(renamed).toHaveCount(0);
      await expect(page).toHaveURL(/\/admin\/compendium$/);
      await expect(page.getByRole('table')).toBeVisible();
      await expect(page.getByRole('row', { name: /Aaa Testwort/ })).toHaveCount(0);
    },
  );

  test(
    'an admin adds a category, edits it, and deletes it, and is told which entries hold one before it can go',
    { tag: '@story-18' },
    async ({ page }) => {
      await signInAs(page, 'categories@story-18.test', ['discord'], 'admin');
      expect((await page.goto('/admin/categories'))?.status()).toBe(200);
      const add = page.getByRole('link', { name: 'Add Category' });
      await expect(page.getByRole('table', { name: 'Categories' })).toBeVisible();
      await assertNoAccessibilityViolations(page);

      // Closed while it loads, it stays closed once its page lands.
      const newGate = await holdModalRequests(page, '/admin/categories', 'new');
      await add.click();
      const adding = page.getByRole('dialog', { name: 'Add Category' });
      await expect(adding.getByRole('status')).toHaveCount(1);
      await page.keyboard.press('Escape');
      await expect(adding).toHaveCount(0);
      await newGate.release();
      await expect(adding).toHaveCount(0);
      await expect(page).toHaveURL(/\/admin\/categories$/);
      await page.unrouteAll();
      // The list beneath is whole: the seeded first page, 25 rows and the header.
      await expect(page.getByRole('table', { name: 'Categories' }).getByRole('row')).toHaveCount(
        26,
      );

      // Opened and left untouched, Escape closes it, and the address loses `?new`.
      await add.click();
      await expect(adding.getByRole('textbox', { name: 'Name' })).toBeVisible();
      await expect(page).toHaveURL(/\/admin\/categories\?new$/);
      await page.keyboard.press('Escape');
      await expect(adding).toHaveCount(0);
      await expect(page).toHaveURL(/\/admin\/categories$/);

      // Added: first by name, so on the first page, with its group and description.
      await add.click();
      await expect(adding).toBeVisible();
      await expect(page).toHaveURL(/\/admin\/categories\?new$/);
      await expect(adding.getByRole('button', { name: 'Save Category' })).toBeDisabled();
      await assertNoAccessibilityViolations(page);
      await adding.getByRole('textbox', { name: 'Name' }).fill('Aaa Testcraft');
      await adding.getByRole('textbox', { name: 'Description' }).fill('Made by the story');
      await adding.getByRole('combobox', { name: 'Group' }).click();
      // The modal's own list: the filter's Group box has a list of its own.
      await adding.getByRole('option', { name: 'Cleansing & Release', exact: true }).click();
      await adding.getByRole('button', { name: 'Save Category' }).click();
      await expect(adding).toHaveCount(0);
      const row = rowOf(page, 'Categories', 'Aaa Testcraft');
      await expect(row.getByRole('cell', { name: 'Cleansing & Release' })).toBeVisible();
      await expect(row.getByRole('cell', { name: 'Made by the story', exact: true })).toBeVisible();

      // Edited: its Edit opens the modal on the press, and the form fills that same dialog.
      const editGate = await holdModalRequests(page, '/admin/categories', 'edit');
      await row.getByRole('link', { name: 'Edit Aaa Testcraft' }).click();
      // An edit dialog is named by its eyebrow and the saved name (MB.115).
      const editing = page.getByRole('dialog', {
        name: 'Edit Category, Aaa Testcraft',
        exact: true,
      });
      await expect(editing).toBeVisible();
      await expect(editing.getByRole('status')).toHaveCount(1);
      await expect(busy(editing)).toHaveCount(1);
      await expect(editing.getByRole('textbox')).toHaveCount(0);
      await expect(page).toHaveURL(/\/admin\/categories$/);
      await assertNoAccessibilityViolations(page);
      const pressed = await editing.elementHandle();
      await editGate.release();
      await expect(page).toHaveURL(/\/admin\/categories\?edit=aaa-testcraft$/);
      await expect(editing.getByRole('textbox', { name: 'Name' })).toBeFocused();
      await expect(busy(editing)).toHaveCount(0);
      // The dialog the press opened is the one the form arrived in.
      expect(await pressed?.evaluate((node) => node.isConnected && node.hasAttribute('open'))).toBe(
        true,
      );
      await page.unrouteAll();
      await editing.getByRole('textbox', { name: 'Name' }).fill('Aaa Testcraft Renamed');
      await editing.getByRole('textbox', { name: 'Description' }).fill('Rewritten by the story');
      await assertNoAccessibilityViolations(page);
      await editing.getByRole('button', { name: 'Save Category' }).click();
      await expect(editing).toHaveCount(0);
      const renamed = rowOf(page, 'Categories', 'Aaa Testcraft Renamed');
      await expect(
        renamed.getByRole('cell', { name: 'Rewritten by the story', exact: true }),
      ).toBeVisible();
      await expect(rowOf(page, 'Categories', 'Aaa Testcraft')).toHaveCount(0);

      // Deleted, at the address its new name gives it.
      await page.goto('/admin/categories?edit=aaa-testcraft-renamed');
      const deleting = page.getByRole('dialog', {
        name: 'Edit Category, Aaa Testcraft Renamed',
        exact: true,
      });
      await deleteFrom(deleting, 'Category');
      await expect(deleting).toHaveCount(0);
      await expect(page.getByRole('table', { name: 'Categories' })).toBeVisible();
      await expect(page.getByRole('row', { name: /Aaa Testcraft/ })).toHaveCount(0);

      // One the compendium files entries under is refused, naming them: the
      // standard seed files Bay Laurel under Protection.
      await page.goto('/admin/categories?edit=protection');
      const held = page.getByRole('dialog', { name: 'Edit Category, Protection', exact: true });
      await deleteFrom(held, 'Category');
      await expect(held.getByRole('alert')).toContainText('Bay Laurel');
      await expect(held).toBeVisible();
      await assertNoAccessibilityViolations(page);
      await held.getByRole('button', { name: 'Close', exact: true }).click();
      await expect(held).toHaveCount(0);
      await page.goto('/admin/categories?query=Protection');
      await expect(rowOf(page, 'Categories', 'Protection')).toBeVisible();
    },
  );

  test(
    'an admin adds a category group, is refused a colour too dark for its ground, renames it, and moves its category before deleting it',
    { tag: '@story-18' },
    async ({ page }) => {
      const { userId } = await signInAs(
        page,
        'category-groups@story-18.test',
        ['discord'],
        'admin',
      );
      expect((await page.goto('/admin/category-groups'))?.status()).toBe(200);
      await expect(page.getByRole('table', { name: 'Category Groups' })).toBeVisible();
      await assertNoAccessibilityViolations(page);

      await page.getByRole('link', { name: 'Add Group' }).click();
      const adding = page.getByRole('dialog', { name: 'Add Category Group' });
      await expect(adding).toBeVisible();
      await expect(page).toHaveURL(/\/admin\/category-groups\?new$/);
      await adding.getByRole('textbox', { name: 'Name' }).fill('Aaa Testwort Wards');
      await adding.getByRole('textbox', { name: 'Description' }).fill('Made by the story');
      await adding.getByRole('textbox', { name: 'Dark Theme Colour', exact: true }).fill('#4e8bc2');
      await adding
        .getByRole('textbox', { name: 'Light Theme Colour', exact: true })
        .fill('#0c5393');
      const saveNew = adding.getByRole('button', { name: 'Save Group' });
      await expect(saveNew).toBeEnabled();
      await assertNoAccessibilityViolations(page);
      await saveNew.click();
      await expect(adding).toHaveCount(0);
      const row = rowOf(page, 'Category Groups', 'Aaa Testwort Wards');
      await expect(row.getByRole('cell', { name: 'Made by the story', exact: true })).toBeVisible();

      // A rename carrying a dark-theme colour too dark for the dark card is
      // refused at the field, and nothing of it is saved.
      await row.getByRole('link', { name: 'Edit Aaa Testwort Wards' }).click();
      const editing = page.getByRole('dialog', {
        name: 'Edit Category Group, Aaa Testwort Wards',
        exact: true,
      });
      await expect(editing).toBeVisible();
      const dark = editing.getByRole('textbox', { name: 'Dark Theme Colour', exact: true });
      // Scanned before the bad colour goes in: the preview then shows that
      // colour on the dark ground at its failing contrast, which is the point of it.
      await assertNoAccessibilityViolations(page);
      await editing.getByRole('textbox', { name: 'Name' }).fill('Aaa Testwort Bulwarks');
      await dark.fill('#0c5393');
      await editing.getByRole('button', { name: 'Save Group' }).click();
      await expect(dark).toHaveAttribute('aria-invalid', 'true');
      await expect(editing).toBeVisible();
      // Leaving asks before the changes go, and the list is as it was.
      await page.keyboard.press('Escape');
      await editing.getByRole('button', { name: 'Discard Changes' }).click();
      await expect(editing).toHaveCount(0);
      await expect(row).toBeVisible();
      await expect(rowOf(page, 'Category Groups', 'Aaa Testwort Bulwarks')).toHaveCount(0);

      // The rename again, with a colour that holds: saved, and read back.
      await row.getByRole('link', { name: 'Edit Aaa Testwort Wards' }).click();
      await expect(editing).toBeVisible();
      await editing.getByRole('textbox', { name: 'Name' }).fill('Aaa Testwort Bulwarks');
      await dark.fill('#5b9bd5');
      await expect(dark).not.toHaveAttribute('aria-invalid', 'true');
      await editing.getByRole('button', { name: 'Save Group' }).click();
      await expect(editing).toHaveCount(0);
      const renamed = rowOf(page, 'Category Groups', 'Aaa Testwort Bulwarks');
      await expect(renamed).toBeVisible();
      await expect(rowOf(page, 'Category Groups', 'Aaa Testwort Wards')).toHaveCount(0);
      await renamed.getByRole('link', { name: 'Edit Aaa Testwort Bulwarks' }).click();
      const bulwarks = page.getByRole('dialog', {
        name: 'Edit Category Group, Aaa Testwort Bulwarks',
        exact: true,
      });
      await expect(
        bulwarks.getByRole('textbox', { name: 'Dark Theme Colour', exact: true }),
      ).toHaveValue('#5b9bd5');
      await bulwarks.getByRole('button', { name: 'Close', exact: true }).click();
      await expect(bulwarks).toHaveCount(0);

      // A category filed under it, so its delete has something to move.
      await withSql(
        (sql) => sql`
          insert into categories (name, slug, description, group_id, created_by, updated_by)
          select 'Aaa Hearthcraft Moved', 'aaa-hearthcraft-moved', 'Filed under the group', id,
            ${userId}, ${userId}
          from category_groups where name = 'Aaa Testwort Bulwarks' and deleted_at is null`,
      );
      await page.goto('/admin/category-groups?edit=aaa-testwort-bulwarks');
      await expect(bulwarks).toBeVisible();
      await moveAndDelete(page, bulwarks, 'Move Its 1 Category To', 'Cleansing & Release');
      await expect(bulwarks).toHaveCount(0);
      await expect(page.getByRole('table', { name: 'Category Groups' })).toBeVisible();
      await expect(rowOf(page, 'Category Groups', 'Aaa Testwort Bulwarks')).toHaveCount(0);

      // The category lives on, in the group the admin picked.
      await page.goto('/admin/categories?query=Aaa+Hearthcraft+Moved');
      await expect(
        rowOf(page, 'Categories', 'Aaa Hearthcraft Moved').getByRole('cell', {
          name: 'Cleansing & Release',
        }),
      ).toBeVisible();
    },
  );

  test(
    'an admin undoes and redoes edits in a category group and in a category, back to the saved values',
    { tag: '@story-18' },
    async ({ page }) => {
      await signInAs(page, 'undo@story-18.test', ['discord'], 'admin');
      expect((await page.goto('/admin/category-groups'))?.status()).toBe(200);
      const groupRow = rowOf(page, 'Category Groups', 'Cleansing & Release');
      await groupRow.getByRole('link', { name: 'Edit Cleansing & Release' }).click();
      const group = page.getByRole('dialog', {
        name: 'Edit Category Group, Cleansing & Release',
        exact: true,
      });
      const name = group.getByRole('textbox', { name: 'Name', exact: true });
      const dark = group.getByRole('textbox', { name: 'Dark Theme Colour', exact: true });
      const save = group.getByRole('button', { name: 'Save Group' });
      const undo = group.getByRole('button', { name: 'Undo', exact: true });
      const redo = group.getByRole('button', { name: 'Redo', exact: true });
      await expect(name).toBeVisible();
      const savedName = await name.inputValue();
      const savedDark = await dark.inputValue();
      await expect(save).toBeDisabled();
      await expect(undo).toBeDisabled();

      await name.fill('Aaa Undone Name');
      await dark.fill('#5b9bd5');
      await expect(save).toBeEnabled();
      await expect(undo).toBeEnabled();

      // The last change goes first, and focus follows it.
      await page.keyboard.press('ControlOrMeta+z');
      await expect(dark).toHaveValue(savedDark);
      await expect(dark).toBeFocused();
      await expect(name).toHaveValue('Aaa Undone Name');
      await page.keyboard.press('ControlOrMeta+z');
      await expect(name).toHaveValue(savedName);
      await expect(name).toBeFocused();
      await expect(save).toBeDisabled();
      await expect(group.getByRole('status', { name: 'Edit History' })).not.toBeEmpty();

      await redo.click();
      await expect(name).toHaveValue('Aaa Undone Name');
      await expect(save).toBeEnabled();
      await undo.click();
      await expect(name).toHaveValue(savedName);
      await expect(save).toBeDisabled();
      await assertNoAccessibilityViolations(page);

      // A drag on the hue slider is one step: the picker reports every pointer
      // move, and one chord still takes the whole drag back.
      const thumb = group.getByRole('slider', { name: 'Dark Theme Colour hue' });
      await thumb.hover();
      const at = (await thumb.boundingBox())!;
      await page.mouse.down();
      await page.mouse.move(at.x + at.width / 2 + 40, at.y + at.height / 2, { steps: 6 });
      await page.mouse.up();
      await expect(dark).not.toHaveValue(savedDark);
      await expect(save).toBeEnabled();
      await page.keyboard.press('ControlOrMeta+z');
      await expect(dark).toHaveValue(savedDark);
      await expect(save).toBeDisabled();

      // Back at its starting values, closing asks nothing.
      await group.getByRole('button', { name: 'Close', exact: true }).click();
      await expect(group).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Discard Changes' })).toHaveCount(0);

      // A category's group, through the combobox.
      await page.goto('/admin/categories?edit=protection');
      const category = page.getByRole('dialog', { name: 'Edit Category, Protection', exact: true });
      const picker = category.getByRole('combobox', { name: 'Group' });
      const saveCategory = category.getByRole('button', { name: 'Save Category' });
      await expect(picker).toBeVisible();
      const savedGroup = await picker.inputValue();
      await expect(saveCategory).toBeDisabled();
      await picker.click();
      await category.getByRole('option', { name: 'Cleansing & Release', exact: true }).click();
      await expect(picker).toHaveValue('Cleansing & Release');
      await expect(saveCategory).toBeEnabled();

      await page.keyboard.press('ControlOrMeta+z');
      await expect(picker).toHaveValue(savedGroup);
      await expect(saveCategory).toBeDisabled();
      await page.keyboard.press('ControlOrMeta+Shift+z');
      await expect(picker).toHaveValue('Cleansing & Release');
      await expect(saveCategory).toBeEnabled();

      // Redone but unsaved, leaving asks; Discard Changes drops it.
      await picker.focus();
      await page.keyboard.press('Escape');
      await category.getByRole('button', { name: 'Discard Changes' }).click();
      await expect(category).toHaveCount(0);
    },
  );

  test(
    'an admin adds a form, renames it and moves it to another group, and deletes it',
    { tag: '@story-18' },
    async ({ page }) => {
      await signInAs(page, 'forms@story-18.test', ['discord'], 'admin');
      expect((await page.goto('/admin/forms'))?.status()).toBe(200);
      await expect(page.getByRole('table', { name: 'Forms' })).toBeVisible();
      await assertNoAccessibilityViolations(page);

      await page.getByRole('link', { name: 'Add Form' }).click();
      const adding = page.getByRole('dialog', { name: 'Add Form' });
      await expect(adding).toBeVisible();
      await expect(page).toHaveURL(/\/admin\/forms\?new$/);
      await expect(adding.getByRole('button', { name: 'Save Form' })).toBeDisabled();
      await adding.getByRole('textbox', { name: 'Name' }).fill('Aaa Testwort Shard');
      await adding.getByRole('textbox', { name: 'Description' }).fill('Made by the story');
      await adding.getByRole('combobox', { name: 'Group' }).click();
      await adding.getByRole('option', { name: 'Mineral', exact: true }).click();
      await assertNoAccessibilityViolations(page);
      await adding.getByRole('button', { name: 'Save Form' }).click();
      await expect(adding).toHaveCount(0);
      // First by name, so on the first page, with its group and description beside it.
      const row = rowOf(page, 'Forms', 'Aaa Testwort Shard');
      await expect(row.getByRole('cell', { name: 'Mineral', exact: true })).toBeVisible();
      await expect(row.getByRole('cell', { name: 'Made by the story', exact: true })).toBeVisible();

      // A form's address is its name and its group's (MB.132).
      await row.getByRole('link', { name: 'Edit Aaa Testwort Shard' }).click();
      const editing = page.getByRole('dialog', {
        name: 'Edit Form, Aaa Testwort Shard',
        exact: true,
      });
      await expect(editing).toBeVisible();
      await expect(page).toHaveURL(
        `/admin/forms?edit=${formSlug('Aaa Testwort Shard', 'Mineral')}`,
      );
      // A rename carries onto the compendium, and Save says so before it is pressed.
      const save = editing.getByRole('button', { name: 'Save Form' });
      await expect(save).toHaveAccessibleDescription('');
      await editing.getByRole('textbox', { name: 'Name' }).fill('Aaa Testwort Sliver');
      await expect(save).toHaveAccessibleDescription(/\S/);
      await editing.getByRole('combobox', { name: 'Group' }).click();
      await editing.getByRole('option', { name: 'Substance', exact: true }).click();
      await assertNoAccessibilityViolations(page);
      await save.click();
      await expect(editing).toHaveCount(0);
      await expect(rowOf(page, 'Forms', 'Aaa Testwort Shard')).toHaveCount(0);
      const renamed = rowOf(page, 'Forms', 'Aaa Testwort Sliver');
      await expect(renamed.getByRole('cell', { name: 'Substance', exact: true })).toBeVisible();

      // Its Edit follows it to the address the new name and group make.
      await renamed.getByRole('link', { name: 'Edit Aaa Testwort Sliver' }).click();
      await expect(page).toHaveURL(
        `/admin/forms?edit=${formSlug('Aaa Testwort Sliver', 'Substance')}`,
      );
      const sliver = page.getByRole('dialog', {
        name: 'Edit Form, Aaa Testwort Sliver',
        exact: true,
      });
      await deleteFrom(sliver, 'Form');
      await expect(sliver).toHaveCount(0);
      await expect(page.getByRole('table', { name: 'Forms' })).toBeVisible();
      await expect(page.getByRole('row', { name: /Aaa Testwort/ })).toHaveCount(0);
    },
  );

  test(
    'an admin adds a form group, renames it, and moves its form before deleting it',
    { tag: '@story-18' },
    async ({ page }) => {
      const { userId } = await signInAs(page, 'form-groups@story-18.test', ['discord'], 'admin');
      expect((await page.goto('/admin/form-groups'))?.status()).toBe(200);
      await expect(page.getByRole('table', { name: 'Form Groups' })).toBeVisible();
      await assertNoAccessibilityViolations(page);

      await page.getByRole('link', { name: 'Add Group' }).click();
      const adding = page.getByRole('dialog', { name: 'Add Form Group' });
      await expect(adding).toBeVisible();
      await expect(page).toHaveURL(/\/admin\/form-groups\?new$/);
      // A form group carries no colours: only a category's chip is drawn in one.
      await expect(
        adding.getByRole('textbox', { name: 'Dark Theme Colour', exact: true }),
      ).toHaveCount(0);
      await adding.getByRole('textbox', { name: 'Name' }).fill('Aaa Fixture Matter');
      await adding.getByRole('textbox', { name: 'Description' }).fill('Made by the story');
      const save = adding.getByRole('button', { name: 'Save Group' });
      await expect(save).toBeEnabled();
      await assertNoAccessibilityViolations(page);
      await save.click();
      await expect(adding).toHaveCount(0);
      const row = rowOf(page, 'Form Groups', 'Aaa Fixture Matter');
      await expect(row.getByRole('cell', { name: 'Made by the story', exact: true })).toBeVisible();

      // A form filed under it, so its rename and its delete have something to carry.
      await withSql(
        (sql) => sql`
          insert into ingredient_forms (name, slug, description, group_id, created_by, updated_by)
          select 'Aaa Fixture Grit', ${formSlug('Aaa Fixture Grit', 'Aaa Fixture Matter')},
            'Filed under the group', id, ${userId}, ${userId}
          from ingredient_form_groups where name = 'Aaa Fixture Matter' and deleted_at is null`,
      );

      await row.getByRole('link', { name: 'Edit Aaa Fixture Matter' }).click();
      const editing = page.getByRole('dialog', {
        name: 'Edit Form Group, Aaa Fixture Matter',
        exact: true,
      });
      await expect(editing).toBeVisible();
      await editing.getByRole('textbox', { name: 'Name' }).fill('Aaa Fixture Stuff');
      await assertNoAccessibilityViolations(page);
      await editing.getByRole('button', { name: 'Save Group' }).click();
      await expect(editing).toHaveCount(0);
      await expect(rowOf(page, 'Form Groups', 'Aaa Fixture Stuff')).toBeVisible();
      await expect(rowOf(page, 'Form Groups', 'Aaa Fixture Matter')).toHaveCount(0);
      // The form is listed under the group's new name.
      await page.goto('/admin/forms');
      const grit = rowOf(page, 'Forms', 'Aaa Fixture Grit');
      await expect(
        grit.getByRole('cell', { name: 'Aaa Fixture Stuff', exact: true }),
      ).toBeVisible();

      await page.goto('/admin/form-groups?edit=aaa-fixture-stuff');
      const renamed = page.getByRole('dialog', {
        name: 'Edit Form Group, Aaa Fixture Stuff',
        exact: true,
      });
      await expect(renamed).toBeVisible();
      await moveAndDelete(page, renamed, 'Move Its 1 Form To', 'Substance');
      await expect(renamed).toHaveCount(0);
      await expect(page.getByRole('table', { name: 'Form Groups' })).toBeVisible();
      await expect(page.getByRole('row', { name: /Aaa Fixture/ })).toHaveCount(0);

      // The form lives on, in the group the admin picked.
      await page.goto('/admin/forms');
      await expect(grit.getByRole('cell', { name: 'Substance', exact: true })).toBeVisible();
    },
  );

  // The two flat vocabularies share one modal and differ only in their nouns,
  // so each walks the same flow rather than one standing in for the other.
  for (const { path, title, label, added, renamedTo } of [
    {
      path: '/admin/celestial-bodies',
      title: 'Celestial Bodies',
      label: 'Celestial Body',
      added: 'Aaa Testwort Star',
      renamedTo: 'Aaa Testwort Comet',
    },
    {
      path: '/admin/zodiac-signs',
      title: 'Zodiac Signs',
      label: 'Zodiac Sign',
      added: 'Aaa Testwort Sign',
      renamedTo: 'Aaa Testwort Omen',
    },
  ]) {
    test(
      `an admin adds a ${label.toLowerCase()}, renames it, and deletes it`,
      { tag: '@story-18' },
      async ({ page }) => {
        await signInAs(page, `${slugify(label)}@story-18.test`, ['discord'], 'admin');
        expect((await page.goto(path))?.status()).toBe(200);
        await expect(page.getByRole('table', { name: title })).toBeVisible();
        await assertNoAccessibilityViolations(page);

        await page.getByRole('link', { name: `Add ${label}` }).click();
        const adding = page.getByRole('dialog', { name: `Add ${label}` });
        await expect(adding).toBeVisible();
        await expect(page).toHaveURL(`${path}?new`);
        await expect(adding.getByRole('button', { name: `Save ${label}` })).toBeDisabled();
        await adding.getByRole('textbox', { name: 'Name' }).fill(added);
        await adding.getByRole('textbox', { name: 'Description' }).fill('Made by the story');
        await assertNoAccessibilityViolations(page);
        await adding.getByRole('button', { name: `Save ${label}` }).click();
        await expect(adding).toHaveCount(0);
        const row = rowOf(page, title, added);
        await expect(
          row.getByRole('cell', { name: 'Made by the story', exact: true }),
        ).toBeVisible();

        await row.getByRole('link', { name: `Edit ${added}` }).click();
        const editing = page.getByRole('dialog', { name: `Edit ${label}, ${added}`, exact: true });
        await expect(editing).toBeVisible();
        await expect(page).toHaveURL(`${path}?edit=${slugify(added)}`);
        // A rename carries onto the compendium, and Save says so before it is pressed.
        const save = editing.getByRole('button', { name: `Save ${label}` });
        await expect(save).toHaveAccessibleDescription('');
        await editing.getByRole('textbox', { name: 'Name' }).fill(renamedTo);
        await editing.getByRole('textbox', { name: 'Description' }).fill('Rewritten by the story');
        await expect(save).toHaveAccessibleDescription(/\S/);
        await assertNoAccessibilityViolations(page);
        await save.click();
        await expect(editing).toHaveCount(0);
        const renamed = rowOf(page, title, renamedTo);
        await expect(
          renamed.getByRole('cell', { name: 'Rewritten by the story', exact: true }),
        ).toBeVisible();
        await expect(rowOf(page, title, added)).toHaveCount(0);

        await renamed.getByRole('link', { name: `Edit ${renamedTo}` }).click();
        await expect(page).toHaveURL(`${path}?edit=${slugify(renamedTo)}`);
        const reopened = page.getByRole('dialog', {
          name: `Edit ${label}, ${renamedTo}`,
          exact: true,
        });
        await deleteFrom(reopened, label);
        await expect(reopened).toHaveCount(0);
        await expect(page.getByRole('table', { name: title })).toBeVisible();
        await expect(page.getByRole('row', { name: /Aaa Testwort/ })).toHaveCount(0);
      },
    );
  }

  test(
    'an admin adds a deity tradition, renames it, and moves its deity before deleting it',
    { tag: '@story-18' },
    async ({ page }) => {
      const { userId } = await signInAs(page, 'traditions@story-18.test', ['discord'], 'admin');
      expect((await page.goto('/admin/deity-traditions'))?.status()).toBe(200);
      await expect(page.getByRole('table', { name: 'Deity Traditions' })).toBeVisible();
      await assertNoAccessibilityViolations(page);

      await page.getByRole('link', { name: 'Add Tradition' }).click();
      const adding = page.getByRole('dialog', { name: 'Add Tradition' });
      await expect(adding).toBeVisible();
      await expect(page).toHaveURL(/\/admin\/deity-traditions\?new$/);
      await adding.getByRole('textbox', { name: 'Name' }).fill('Aaa Fixtural');
      await adding.getByRole('textbox', { name: 'Description' }).fill('Made by the story');
      const saveNew = adding.getByRole('button', { name: 'Save Tradition' });
      await expect(saveNew).toBeEnabled();
      await assertNoAccessibilityViolations(page);
      await saveNew.click();
      await expect(adding).toHaveCount(0);
      const row = rowOf(page, 'Deity Traditions', 'Aaa Fixtural');
      await expect(row.getByRole('cell', { name: 'Made by the story', exact: true })).toBeVisible();

      // A deity filed under it, so its rename and its delete have something to carry.
      await withSql(
        (sql) => sql`
          insert into deities (name, slug, description, tradition_id, created_by, updated_by)
          select 'Aaa Testra', ${deitySlug('Aaa Testra', 'Aaa Fixtural')},
            'Filed under the tradition', id, ${userId}, ${userId}
          from deity_traditions where name = 'Aaa Fixtural' and deleted_at is null`,
      );

      await row.getByRole('link', { name: 'Edit Aaa Fixtural' }).click();
      const editing = page.getByRole('dialog', {
        name: 'Edit Tradition, Aaa Fixtural',
        exact: true,
      });
      await expect(editing).toBeVisible();
      await editing.getByRole('textbox', { name: 'Name' }).fill('Aaa Mockish');
      await assertNoAccessibilityViolations(page);
      await editing.getByRole('button', { name: 'Save Tradition' }).click();
      await expect(editing).toHaveCount(0);
      await expect(rowOf(page, 'Deity Traditions', 'Aaa Mockish')).toBeVisible();
      await expect(rowOf(page, 'Deity Traditions', 'Aaa Fixtural')).toHaveCount(0);
      // The deity is listed under its tradition's new name, at the address that name makes.
      await page.goto('/admin/deities');
      const testra = rowOf(page, 'Deities', 'Aaa Testra');
      await expect(testra.getByRole('cell', { name: 'Aaa Mockish', exact: true })).toBeVisible();
      await testra.getByRole('link', { name: 'Edit Aaa Testra' }).click();
      await expect(page).toHaveURL(`/admin/deities?edit=${deitySlug('Aaa Testra', 'Aaa Mockish')}`);
      await expect(
        page.getByRole('dialog', { name: 'Edit Deity, Aaa Testra, Aaa Mockish', exact: true }),
      ).toBeVisible();

      await page.goto('/admin/deity-traditions?edit=aaa-mockish');
      const renamed = page.getByRole('dialog', {
        name: 'Edit Tradition, Aaa Mockish',
        exact: true,
      });
      await expect(renamed).toBeVisible();
      await moveAndDelete(page, renamed, 'Move Its 1 Deity To', 'Greek');
      await expect(renamed).toHaveCount(0);
      await expect(page.getByRole('table', { name: 'Deity Traditions' })).toBeVisible();
      await expect(page.getByRole('row', { name: /Aaa Mockish/ })).toHaveCount(0);

      // The deity lives on, under the tradition the admin picked.
      // Filtered by name: the list runs by tradition, so Greek is pages on.
      await page.goto('/admin/deities?query=Aaa+Testra');
      await expect(testra.getByRole('cell', { name: 'Greek', exact: true })).toBeVisible();
      await testra.getByRole('link', { name: 'Edit Aaa Testra' }).click();
      // The filter rides along in the address, beside the deity's new slug.
      await expect(page).toHaveURL(new RegExp(`[?&]edit=${deitySlug('Aaa Testra', 'Greek')}$`));
      await expect(
        page.getByRole('dialog', { name: 'Edit Deity, Aaa Testra, Greek', exact: true }),
      ).toBeVisible();
    },
  );

  test(
    'an admin adds and renames a deity, is refused its delete while an entry holds it, and deletes it once freed',
    { tag: '@story-18' },
    async ({ page }) => {
      const { userId } = await signInAs(page, 'deities@story-18.test', ['discord'], 'admin');
      expect((await page.goto('/admin/deities'))?.status()).toBe(200);
      await expect(page.getByRole('table', { name: 'Deities' })).toBeVisible();
      await assertNoAccessibilityViolations(page);
      // Narrowed to the name it will add: the list runs by tradition, then name,
      // so a deity under Greek sits pages in.
      await page.goto('/admin/deities?query=Aaa+Testri');

      await page.getByRole('link', { name: 'Add Deity' }).click();
      const adding = page.getByRole('dialog', { name: 'Add Deity' });
      await expect(adding).toBeVisible();
      await expect(page).toHaveURL(/\/admin\/deities\?query=Aaa\+Testri&new$/);
      await adding.getByRole('textbox', { name: 'Name' }).fill('Aaa Testris');
      await adding.getByRole('textbox', { name: 'Description' }).fill('Made by the story');
      const tradition = adding.getByRole('combobox', { name: 'Tradition' });
      await tradition.click();
      await adding.getByRole('option', { name: 'Greek', exact: true }).click();
      // A type-ahead box: the pick is its text.
      await expect(tradition).toHaveValue('Greek');
      await assertNoAccessibilityViolations(page);
      await adding.getByRole('button', { name: 'Save Deity' }).click();
      await expect(adding).toHaveCount(0);
      const row = rowOf(page, 'Deities', 'Aaa Testris');
      await expect(row.getByRole('cell', { name: 'Greek', exact: true })).toBeVisible();
      await expect(row.getByRole('cell', { name: 'Made by the story', exact: true })).toBeVisible();

      // An edit dialog names the tradition too: two deities may share a name.
      await row.getByRole('link', { name: 'Edit Aaa Testris' }).click();
      const editing = page.getByRole('dialog', {
        name: 'Edit Deity, Aaa Testris, Greek',
        exact: true,
      });
      await expect(editing).toBeVisible();
      await expect(page).toHaveURL(
        `/admin/deities?query=Aaa+Testri&edit=${deitySlug('Aaa Testris', 'Greek')}`,
      );
      await editing.getByRole('textbox', { name: 'Name' }).fill('Aaa Testrix');
      await assertNoAccessibilityViolations(page);
      await editing.getByRole('button', { name: 'Save Deity' }).click();
      await expect(editing).toHaveCount(0);
      const renamed = rowOf(page, 'Deities', 'Aaa Testrix');
      await expect(renamed.getByRole('cell', { name: 'Greek', exact: true })).toBeVisible();
      await expect(rowOf(page, 'Deities', 'Aaa Testris')).toHaveCount(0);

      // A compendium entry that lists it among its deities.
      const entry = 'Aaa Testwort Hallowed';
      await withSql(async (sql) => {
        // Linked to the curated form's row: the compendium saves a picked form
        // and no other, and the admin saves this entry below.
        const [herb] = await sql<{ id: string }[]>`
          select id from ingredient_forms where name = 'Herb' and deleted_at is null`;
        const ingredientId = await insertIngredient(
          sql,
          makeIngredient({
            name: entry,
            nomenclature: 'none',
            variants: [makeVariant({ form: 'Herb', formId: herb.id })],
          }),
          userId,
        );
        const [deity] = await sql<{ id: string }[]>`
          select id from deities where name = 'Aaa Testrix' and deleted_at is null`;
        await insertDeityLink(sql, ingredientId, deity.id, 0, userId);
      });

      // Refused while the entry holds it, naming the entry; nothing leaves.
      await renamed.getByRole('link', { name: 'Edit Aaa Testrix' }).click();
      const held = page.getByRole('dialog', {
        name: 'Edit Deity, Aaa Testrix, Greek',
        exact: true,
      });
      await expect(held).toBeVisible();
      await deleteFrom(held, 'Deity');
      await expect(held.getByRole('alert')).toContainText(entry);
      await expect(held).toBeVisible();
      await assertNoAccessibilityViolations(page);
      await held.getByRole('button', { name: 'Close', exact: true }).click();
      await expect(held).toHaveCount(0);
      await expect(renamed).toBeVisible();

      // Freed: taken off the entry's deities, as the refusal's remedy says.
      await page.goto(`/admin/compendium?edit=${slugify(entry)}`);
      const entryDialog = page.getByRole('dialog', {
        name: `Edit Ingredient, ${entry}`,
        exact: true,
      });
      await expect(entryDialog).toBeVisible();
      await entryDialog.getByRole('button', { name: 'Open All' }).click();
      // A curated deity's chip carries its tradition, as two may share a name.
      const remove = entryDialog
        .getByRole('group', { name: 'Deities', exact: true })
        .getByRole('button', { name: 'Remove Aaa Testrix (Greek)', exact: true });
      await remove.click();
      await expect(remove).toHaveCount(0);
      const saveEntry = entryDialog.getByRole('button', { name: 'Save Ingredient' });
      await saveEntry.click();
      await expect(entryDialog.getByRole('status').filter({ hasText: entry })).toBeVisible();
      await expect(saveEntry).toBeDisabled();

      // Now it goes, and the list no longer holds it.
      await page.goto(`/admin/deities?query=Aaa+Testri&edit=${deitySlug('Aaa Testrix', 'Greek')}`);
      await expect(held).toBeVisible();
      await deleteFrom(held, 'Deity');
      await expect(held).toHaveCount(0);
      // Back on the list narrowed to its name, which no longer finds it.
      await expect(page).toHaveURL(/\/admin\/deities\?query=Aaa\+Testri$/);
      await expect(page.getByRole('link', { name: 'Add Deity' })).toBeVisible();
      await expect(page.getByRole('row', { name: /Aaa Testri/ })).toHaveCount(0);
    },
  );
});
