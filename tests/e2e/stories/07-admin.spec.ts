import type { Page } from '@playwright/test';
import postgres from 'postgres';
import { slugify } from '@/lib/slugify';
import { insertIngredient } from '../../support/db/insert-ingredient';
import { makeIngredient, makeVariant } from '../../support/fixtures/ingredient';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll } from '../axe';
import { e2eDatabaseUrl, recreateE2eDatabase } from '../database';
import { test, expect } from '../fixtures';
import { signInAgainAs, signInAs } from '../session';

// Stories 17, 18 and 19, walked in the browser: what a site admin curates and
// how, what everyone else is refused, and what an admin does not reach — a
// coven's own pages. Setup goes straight to the database (MB.101); each
// story's own step goes through the pages a person would use.
test.describe.configure({ mode: 'serial' });

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
      const name = 'Aaa Testwort Guarded';
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

      // Today a non-admin meets a compendium entry nowhere but these addresses;
      // the public compendium (M8.18, M8.19) will show them entries, and this
      // walk extends there: the entry's page read, with no Edit or Delete on it.
      await expectNotAuthorized(page, `/admin/compendium?edit=${slug}`);
      await expect(page.getByRole('textbox')).toHaveCount(0);
      await expectNotAuthorized(page, '/admin/compendium?new');

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

      await dialog.getByRole('button', { name: 'Close' }).click();
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
          await expect(page.getByRole('heading', { level: 1, name: '404' })).toBeVisible();
          await expect(page.getByRole('navigation', { name: 'Coven' })).toHaveCount(0);
        }
        // No axe scan: the 404 is Next's default page, since the app has no
        // not-found.tsx, and it has no main landmark, which axe refuses
        // (landmark-one-main, region). The scan joins when the app draws its own.
      },
    );
  }
});
