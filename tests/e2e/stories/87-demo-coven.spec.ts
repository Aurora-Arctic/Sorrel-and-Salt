import { test, expect } from '../fixtures';
import { assertNoAccessibilityViolations } from '../axe';
import { recreateE2eDatabase } from '../database';
import { signInAgainAs, signInAs } from '../session';
import { withSql } from './accounts-setup';

// Story 87: a new account lands in the demo coven as a viewer and can leave it, and a site admin owns it. `signInAs`
// writes the account's rows by SQL and so skips the sign-up hook; the viewer seat the hook writes is written here
// by SQL as well. The sign-up hook is not walked here, because the suite runs no OAuth provider; the
// end-to-end sign-up in tests/db/email-verification.test.ts proves it.

const DEMO_SLUG = 'sorrel-and-salt-demo';
const DEMO_PATH = `/coven/${DEMO_SLUG}`;
const VIEWER_NOTICE =
  'This is a demo coven, so you can see how Sorrel & Salt works. You can look at everything and change nothing. A coven of your own starts with an invitation from someone who has one.';
const OWNER_NOTICE =
  'You own this coven as a site admin: what you change here is what every new account sees.';

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test.describe('Story 87: A New Account Lands in the Demo Coven', { tag: '@story-87' }, () => {
  test('a new account is a viewer in the demo coven, and leaving is final', async ({ page }) => {
    const { userId } = await signInAs(page, 'newcomer@example.test');
    await withSql(async (sql) => {
      const [demo] = await sql`select id from workspaces where demo and deleted_at is null`;
      // Why the viewer's empty-handedness below is the role's: the owner seat of the same coven is checked in the
      // second test, on the same pages.
      expect(demo, 'the template holds the demo coven').toBeDefined();
      await sql`
        insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
        values (${demo.id}, ${userId}, 'viewer', ${userId}, ${userId})`;
    });

    await test.step('the demo coven is the account’s coven, badged and with the viewer notice', async () => {
      await page.goto('/coven');
      await expect(page).toHaveURL(new RegExp(`${DEMO_PATH}$`));
      await expect(page.getByRole('combobox', { name: 'Coven' })).toHaveText(/Sorrel & Salt Demo/);
      const heading = page.getByRole('heading', { level: 1 });
      await expect(heading).toContainText('Sorrel & Salt Demo');
      await expect(heading).toContainText('Demo');
      await expect(page.getByText(VIEWER_NOTICE)).toBeVisible();
      await expect(page.getByText(OWNER_NOTICE)).toHaveCount(0);
      await assertNoAccessibilityViolations(page);
    });

    await test.step('Ingredients and Grimoire open with the notice and offer no way to add', async () => {
      for (const section of ['ingredients', 'grimoire']) {
        const response = await page.goto(`${DEMO_PATH}/${section}`);
        expect(response?.status()).toBe(200);
        await expect(page.getByText(VIEWER_NOTICE)).toBeVisible();
        await expect(
          page.getByRole('button', { name: /^(Add|New) /, disabled: false }),
        ).toHaveCount(0);
      }
      // The add dialog's address opens nothing for a viewer.
      await page.goto(`${DEMO_PATH}/grimoire?new=spell`);
      await expect(page.getByRole('dialog')).toHaveCount(0);
    });

    await test.step('the account leaves, and is not seated again on its next sign-in', async () => {
      await page.goto(DEMO_PATH);
      await page
        .getByRole('main')
        .getByRole('button', { name: 'Leave Coven', exact: true })
        .click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Leave Coven', exact: true })
        .click();
      await expect(page).toHaveURL(/\/coven$/);
      await expect(page.getByRole('heading', { level: 1, name: 'Join a Coven' })).toBeVisible();

      await signInAgainAs(page, userId);
      await page.goto('/coven');
      await expect(page).toHaveURL(/\/coven$/);
      await expect(page.getByRole('heading', { level: 1, name: 'Join a Coven' })).toBeVisible();
      await expect(page.getByRole('combobox', { name: 'Coven' })).toHaveCount(0);
      expect((await page.goto(DEMO_PATH))?.status()).toBe(404);
    });
  });

  test('an account with a coven of its own lands there, not in the demo coven', async ({
    page,
  }) => {
    const { userId } = await signInAs(page, 'keeper@example.test');
    const own = { name: 'Testwort Coven', slug: 'testwort-coven' };
    // Why the demo coven could have won: its name sorts ahead of this one, so a plain alphabetical order lands the account in it.
    expect('Sorrel & Salt Demo'.localeCompare(own.name)).toBeLessThan(0);
    await withSql(async (sql) => {
      const [demo] = await sql`select id from workspaces where demo and deleted_at is null`;
      expect(demo, 'the template holds the demo coven').toBeDefined();
      const [coven] = await sql`
        insert into workspaces (name, slug, created_by, updated_by)
        values (${own.name}, ${own.slug}, ${userId}, ${userId}) returning id`;
      await sql`
        insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
        values (${coven.id}, ${userId}, 'owner', ${userId}, ${userId}),
               (${demo.id}, ${userId}, 'viewer', ${userId}, ${userId})`;
    });

    await page.goto('/sign-in');
    await expect(page).toHaveURL(new RegExp(`/coven/${own.slug}$`));
    await page.goto('/coven');
    await expect(page).toHaveURL(new RegExp(`/coven/${own.slug}$`));
    await expect(page.getByRole('combobox', { name: 'Coven' })).toHaveText(/Testwort Coven/);
    await assertNoAccessibilityViolations(page);
  });

  test('a site admin owns the demo coven', async ({ page }) => {
    await signInAs(page, 'owner@example.test', ['discord'], 'admin');
    await withSql(async (sql) => {
      const [demo] = await sql`select id from workspaces where demo and deleted_at is null`;
      expect(demo, 'the template holds the demo coven').toBeDefined();
      const [user] = await sql`select id from users where email = 'owner@example.test'`;
      // The admin is seated as the seed seats every admin, the sign-up hook never having run for it.
      await sql`
        insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
        values (${demo.id}, ${user.id}, 'owner', ${user.id}, ${user.id})`;
    });

    await page.goto(DEMO_PATH);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Demo');
    await expect(page.getByText(OWNER_NOTICE)).toBeVisible();
    await expect(page.getByText(VIEWER_NOTICE)).toHaveCount(0);

    await page.goto(`${DEMO_PATH}/ingredients`);
    await expect(
      page.getByRole('button', { name: 'Add Ingredient', disabled: false }).first(),
    ).toBeVisible();
  });
});
