import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll, settleTransitions } from './axe';
import postgres from 'postgres';
import { e2eDatabaseUrl, recreateE2eDatabase } from './database';
import { signInAgainAs, signInAs } from './session';

// The create-workspace page against the built server (M9.16, Story 3): a
// rights holder names a coven from the keyboard and lands in it as its
// owner, makes a second, and a coven named "New" never takes the page's own
// address. A user without the right is offered no form; that the service
// refuses them is tests/modules/coven/services/workspace-creation.test.ts's.
// The switcher's entry to this page is walked in shell.spec.ts.
test.describe.configure({ mode: 'serial' });

const users = { holder: { id: '' }, outsider: { id: '' } };

const ownersOf = async (slug: string) => {
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    return await sql`
      select m.user_id, m.role::text from workspace_members m
      join workspaces w on w.id = m.workspace_id
      where w.slug = ${slug} and m.deleted_at is null`;
  } finally {
    await sql.end();
  }
};

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('one user holds creation rights and the other does not', async ({ page }) => {
  users.holder = { id: (await signInAs(page, 'holder@coven-create.test')).userId };
  users.outsider = { id: (await signInAs(page, 'outsider@coven-create.test')).userId };

  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    await sql.begin(async (tx) => {
      // A grant made by hand declares its route, as signInAs's insert does.
      await tx`select set_config('app.privilege_route', 'manual', true)`;
      await tx`update users set can_create_workspace = true where id = ${users.holder.id}`;
    });
    const rows = await sql`
      select id, can_create_workspace from users where id in ${sql([users.holder.id, users.outsider.id])}`;
    expect(Object.fromEntries(rows.map((row) => [row.id, row.can_create_workspace]))).toEqual({
      [users.holder.id]: true,
      [users.outsider.id]: false,
    });
  } finally {
    await sql.end();
  }
});

test(
  'a holder creates a coven from the keyboard and lands in it as owner',
  { tag: '@story-3' },
  async ({ page }) => {
    await signInAgainAs(page, users.holder.id);
    await page.goto('/coven/new');

    const name = page.getByRole('textbox', { name: 'Name' });
    // Bounded: the shell's stops (the skip link, the brand, the bar's buttons)
    // come first, and a few spare presses tolerate another.
    let reached = false;
    for (let i = 0; i < 12 && !reached; i++) {
      await page.keyboard.press('Tab');
      reached = await name.evaluate((element) => element === document.activeElement);
    }
    expect(reached).toBe(true);
    await page.keyboard.type('Fixture Coven');
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/coven\/fixture-coven$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Fixture Coven' })).toBeVisible();
    // Delete is shown by the owner's permission: the page agrees with the row.
    await expect(page.getByRole('button', { name: 'Delete Coven', exact: true })).toBeVisible();
    expect(await ownersOf('fixture-coven')).toEqual([{ user_id: users.holder.id, role: 'owner' }]);
  },
);

test(
  'the same holder makes a second coven, and one named New never takes the page’s address',
  { tag: '@story-3' },
  async ({ page }) => {
    await signInAgainAs(page, users.holder.id);
    await page.goto('/coven/new');

    await page.getByRole('textbox', { name: 'Name' }).fill('New');
    await page.getByRole('button', { name: 'Create Coven', exact: true }).click();

    await expect(page).toHaveURL(/\/coven\/new-2$/);
    await expect(page.getByRole('heading', { level: 1, name: 'New' })).toBeVisible();
    expect(await ownersOf('new-2')).toEqual([{ user_id: users.holder.id, role: 'owner' }]);

    // The address is still the create page, not the coven called New.
    const again = await page.goto('/coven/new');
    expect(again?.status()).toBe(200);
    await expect(page.getByRole('textbox', { name: 'Name' })).toBeVisible();
  },
);

test('a user without the right is offered no form', async ({ page }) => {
  await signInAgainAs(page, users.outsider.id);

  const response = await page.goto('/coven/new');

  expect(response?.status()).toBe(200);
  await expect(page.getByRole('main').getByRole('status')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Name' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Create Coven', exact: true })).toHaveCount(0);
});

test('the page passes the scans in both themes, with and without the form', async ({ page }) => {
  for (const user of [users.holder, users.outsider]) {
    await signInAgainAs(page, user.id);
    await page.goto('/coven/new');
    for (const colorScheme of ['dark', 'light'] as const) {
      await page.emulateMedia({ colorScheme });
      await settleTransitions(page);
      await assertNoAccessibilityViolations(page);
    }
    await assertNoSidewaysScroll(page);
  }
});
