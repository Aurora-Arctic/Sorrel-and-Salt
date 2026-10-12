import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll } from './axe';
import postgres from 'postgres';
import { e2eDatabaseUrl, recreateE2eDatabase } from './database';
import { PRIMARY_ADMIN_EMAIL, signInAgainAs, signInAs } from './session';

// The `/admin` guard against the built server (M5.4; claude-docs/auth/admin-guard.md, "The
// admin guard"): a signed-in non-admin is refused with a 403 page on every
// admin route, and an admin sees the layout and one flow per page. A
// signed-out visitor's redirect is route-protection.spec.ts's.
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

/**
 * The primary admin's id: the user an earlier test signed in at the address,
 * or one made now, since the email index admits the address once.
 */
async function primaryAdminId(page: Page): Promise<string> {
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    const [row] = await sql`select id from users where email = ${PRIMARY_ADMIN_EMAIL}`;
    if (row) return row.id as string;
  } finally {
    await sql.end();
  }
  return (await signInAs(page, PRIMARY_ADMIN_EMAIL, ['google'], 'admin')).userId;
}

/** The privilege ledger's rows for one user, as the trigger on `users` wrote them (MB.195). */
async function privilegeChanges(userId: string) {
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    return await sql`
      select privilege::text, change::text, via::text, note from user_privilege_changes
      where user_id = ${userId} and via = 'admin' order by created_at, privilege
    `;
  } finally {
    await sql.end();
  }
}

test('a signed-in non-admin is refused at /admin with a 403 page and no admin markup', async ({
  page,
}) => {
  await signInAs(page, 'not-an-admin@admin-guard.test');

  const response = await page.goto('/admin');

  // The server's own answer, not a client redirect after the fact: a 403 at
  // the same URL, and the admin area never reached the browser — not in the
  // markup, and not in the RSC payload the response carries.
  expect(response?.status()).toBe(403);
  expect(new URL(page.url()).pathname).toBe('/admin');
  expect(await response?.text()).not.toContain('/admin/compendium');

  await expect(page.getByRole('navigation', { name: 'Admin' })).toHaveCount(0);
  await expect(
    page.getByRole('main').getByRole('heading', { level: 1, name: 'Not Authorized' }),
  ).toBeVisible();
  await assertNoSidewaysScroll(page);
  await assertNoAccessibilityViolations(page);
});

test('an admin sees the admin layout and its nav', async ({ page }) => {
  await signInAs(page, 'an-admin@admin-guard.test', ['discord'], 'admin');

  const response = await page.goto('/admin');

  expect(response?.status()).toBe(200);
  // One link per page, each at its first tab: a group list is a tab of the
  // list it organises, and Astrology holds the celestial bodies and zodiac signs (MB.115).
  const nav = page.getByRole('navigation', { name: 'Admin' });
  const pages = [
    ['Compendium', '/admin/compendium'],
    ['Categories', '/admin/categories'],
    ['Forms', '/admin/forms'],
    ['Deities', '/admin/deities'],
    ['Astrology', '/admin/celestial-bodies'],
    ['People', '/admin/users'],
  ];
  await expect(nav.getByRole('link')).toHaveCount(pages.length);
  for (const [name, href] of pages) {
    await expect(nav.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
  }

  // Body copy keeps to the reading measure, `$measure` (66ch), however wide the
  // layout around it — and this layout is wider, or the check proves nothing.
  // 66ch is measured in the paragraph's own font, by a probe that reads nothing
  // from the stylesheet's rule. The paragraph wraps, so it fills its cap: equal
  // to the measure, which a narrower cap would fail as surely as a wider one.
  const paragraph = page.getByRole('main').getByRole('paragraph').first();
  const measure = await paragraph.evaluate((element) => {
    const probe = document.createElement('span');
    probe.style.cssText = 'display: inline-block; width: 66ch';
    element.append(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width;
  });
  const main = await page.getByRole('main').boundingBox();
  expect(main!.width).toBeGreaterThan(measure);
  expect((await paragraph.boundingBox())!.width).toBeCloseTo(measure, 0);

  await assertNoAccessibilityViolations(page);
});

// MB.52: the user list, against the built server. The service's refusal is
// tests/modules/identity/services/user-list.test.ts's; here the page is
// refused before it reads anything, and an admin sees each account's methods.
test('a signed-in non-admin is refused at /admin/users with the 403 page', async ({ page }) => {
  await signInAs(page, 'not-an-admin@admin-users.test');

  const response = await page.goto('/admin/users');

  expect(response?.status()).toBe(403);
  expect(await response?.text()).not.toContain('not-an-admin@admin-users.test');
  await expect(page.getByRole('heading', { level: 1, name: 'Not Authorized' })).toBeVisible();
});

test('an admin lists the users at /admin/users, filtered, with their sign-in methods', async ({
  page,
}) => {
  await signInAs(page, 'an-admin@admin-users.test', ['discord', 'google'], 'admin');

  const response = await page.goto('/admin/users?query=admin-users.test');

  expect(response?.status()).toBe(200);
  // Users is the People page's first tab, and the one open here.
  const tab = page.getByRole('navigation', { name: 'People' }).getByRole('link', { name: 'Users' });
  await expect(tab).toHaveAttribute('href', '/admin/users');
  await expect(tab).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('search').getByLabel('Name or Email')).toHaveValue(
    'admin-users.test',
  );
  // A filter's switch takes Space as a checkbox does, which only a browser's
  // own keyboard handling shows, and applies the moment it changes (MB.115):
  // the address gains the flag, the list narrows to the one user not yet
  // approved, and the switch, drawn afresh with the new list, has the focus
  // back, so a second Space widens the list again.
  const awaiting = page.getByRole('search').getByRole('switch', { name: 'Needs Approval' });
  const rows = page.getByRole('row').filter({ has: page.getByRole('cell') });
  await awaiting.focus();
  await page.keyboard.press('Space');
  await expect(page).toHaveURL(/\/admin\/users\?query=admin-users\.test&awaiting$/);
  await expect(awaiting).toBeChecked();
  await expect(rows).toHaveCount(1);
  await expect(awaiting).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page).toHaveURL(/\/admin\/users\?query=admin-users\.test$/);
  await expect(awaiting).not.toBeChecked();

  // The filter's two matches, and nothing from admin-guard.test's earlier sign-ins.
  await expect(rows).toHaveCount(2);
  // Anchored on the name and the verified mark's word before it:
  // not-an-admin's address ends the same way.
  const admin = page.getByRole('row', {
    name: /Fixture Person Verified an-admin@admin-users\.test/,
  });
  // The name, the address, the role, the creation flag, both sign-in
  // methods and the joining date: the account's state as the row carries it.
  await expect(admin.getByRole('cell')).toHaveText([
    /Fixture Person$/,
    /an-admin@admin-users\.test$/,
    /^Admin/,
    // A mark alone: every admin may create a workspace, and the users CHECK
    // says so (MB.177), so the cell offers no control.
    'Yes',
    /Discord.*Google/,
    /\d/,
  ]);
  // The mark's tip bubble shows on hover, a real browser's CSS (the owner's review).
  const email = admin.getByRole('cell').nth(1);
  const tip = email.locator('.user-list__tip');
  await expect(tip).toBeHidden();
  await email.locator('.user-list__mark').hover();
  await expect(tip).toBeVisible();
  await expect(tip).toHaveText('Verified');
  // So does each sign-in logo's.
  const discord = admin
    .getByRole('cell')
    .nth(4)
    .locator('.user-list__hint:has(.provider-mark--discord)');
  await discord.hover();
  await expect(discord.locator('.user-list__tip')).toBeVisible();
  await assertNoAccessibilityViolations(page);
});

// M9.19, story 19 as narrowed: an admin sees which covens a user holds, and
// with what role, in a modal over the list, and reaches none of them
// (claude-docs/design-decisions/m9.19-admin-sees-user-covens.md).
test(
  'an admin opens a user from the list and sees their covens, linked to none, then closes back to the list',
  { tag: '@story-19' },
  async ({ page }) => {
    const email = 'coven-holder@admin-user-modal.test';
    const coven = 'Fixture Modal Coven';
    const { userId } = await signInAs(page, email);
    const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
    try {
      const [workspace] = await sql`
        insert into workspaces (name, slug, created_by, updated_by)
        values (${coven}, 'fixture-modal-coven', ${userId}, ${userId})
        returning id`;
      await sql`
        insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
        values (${workspace.id}, ${userId}, 'owner', ${userId}, ${userId})`;
    } finally {
      await sql.end();
    }
    await signInAs(page, 'an-admin@admin-user-modal.test', ['google'], 'admin');

    await page.goto(`/admin/users?query=${encodeURIComponent(email)}`);
    await page.getByRole('row').getByRole('link', { name: 'Fixture Person', exact: true }).click();

    // Named by its eyebrow, the user's name and their address.
    const dialog = page.getByRole('dialog', { name: new RegExp(`Fixture Person.*${email}`) });
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`[?&]user=${userId}$`));
    const row = dialog.getByRole('row', { name: new RegExp(coven) });
    await expect(row).toContainText('Owner');
    // An admin is no member, so the coven's own page would answer 404.
    await expect(dialog.locator('a[href*="/coven/"]')).toHaveCount(0);
    // Impersonation is not registered in this run, so the body offers no Impersonate.
    await expect(dialog.getByRole('button', { name: /Impersonate/ })).toHaveCount(0);
    await assertNoAccessibilityViolations(page);

    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).toHaveURL(/\/admin\/users\?query=[^&]*$/);
  },
);

// A hand-edited `?user=`: the list, with the notice over it, and no modal.
test('an admin at an address naming no user sees the list with the notice and no modal', async ({
  page,
}) => {
  await signInAs(page, 'an-admin@admin-user-missing.test', ['google'], 'admin');

  const response = await page.goto('/admin/users?user=not-an-id');

  expect(response?.status()).toBe(200);
  // In the page's main: Next puts its route announcer, an empty alert, in <body>.
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('table')).toBeVisible();
});

// M5.8: an admin approves a user with no invitation from their row, behind a
// modal naming them, and then revokes it, the row saying so each time.
test('an admin approves a user awaiting approval at /admin/users, then revokes it', async ({
  page,
}) => {
  // Signed in once to make the account, then the page signs in as the admin.
  const { userId } = await signInAs(page, 'awaiting@admin-approval.test');
  await signInAs(page, 'an-admin@admin-approval.test', ['discord'], 'admin');

  const response = await page.goto('/admin/users?query=awaiting%40admin-approval.test');
  expect(response?.status()).toBe(200);
  const row = page.getByRole('row', { name: /awaiting@admin-approval\.test/ });
  await expect(row.getByRole('cell').nth(3)).toHaveText(/^No/);

  await row.getByRole('button', { name: 'Approve Fixture Person' }).click();
  const approving = page.getByRole('dialog', { name: 'Approve Coven Creation' });
  await expect(approving).toContainText('Fixture Person');
  await expect(approving.getByRole('button', { name: 'Approve' })).toBeFocused();
  // An optional reason, as Grant and Revoke of admin take one.
  await approving.getByRole('textbox', { name: 'Reason' }).fill('Runs the Tuesday circle');
  await assertNoAccessibilityViolations(page);

  await approving.getByRole('button', { name: 'Approve' }).click();
  await expect(approving).toHaveCount(0);

  await expect(row.getByRole('cell').nth(3)).toHaveText(/^Yes/);
  expect(await privilegeChanges(userId)).toEqual([
    {
      privilege: 'create_workspace',
      change: 'grant',
      via: 'admin',
      note: 'Runs the Tuesday circle',
    },
  ]);

  // And revoked again, behind its own modal.
  await row.getByRole('button', { name: 'Revoke approval for Fixture Person' }).click();
  const revoking = page.getByRole('dialog', { name: 'Revoke Coven Creation' });
  await expect(revoking).toContainText('Fixture Person');
  await revoking.getByRole('button', { name: 'Revoke' }).click();
  await expect(revoking).toHaveCount(0);

  await expect(row.getByRole('cell').nth(3)).toHaveText(/^No/);
  await expect(row.getByRole('button', { name: 'Approve Fixture Person' })).toBeVisible();
});

// MB.59: an admin grants admin to a user from their row, behind a modal naming
// them with an optional reason the ledger keeps, and then revokes it.
test(
  'an admin grants admin to a user at /admin/users with a reason, then revokes it',
  { tag: '@story-60' },
  async ({ page }) => {
    const { userId } = await signInAs(page, 'grantee@admin-role.test');
    await signInAs(page, 'an-admin@admin-role.test', ['discord'], 'admin');

    const response = await page.goto('/admin/users?query=grantee%40admin-role.test');
    expect(response?.status()).toBe(200);
    const row = page.getByRole('row', { name: /grantee@admin-role\.test/ });
    await expect(row.getByRole('cell').nth(2)).toHaveText(/^User/);
    await expect(row.getByRole('cell').nth(3)).toHaveText(/^No/);

    await row.getByRole('button', { name: 'Grant admin to Fixture Person' }).click();
    const granting = page.getByRole('dialog', { name: 'Grant Admin' });
    await expect(granting).toContainText('Fixture Person');
    await expect(granting.getByRole('button', { name: 'Grant' })).toBeFocused();
    await granting.getByRole('textbox', { name: 'Reason' }).fill('Curates the planets');
    await assertNoAccessibilityViolations(page);

    await granting.getByRole('button', { name: 'Grant' }).click();
    await expect(granting).toHaveCount(0);

    // An admin now, who may create a coven, so the creation cell holds the mark alone.
    await expect(row.getByRole('cell').nth(2)).toHaveText(/^Admin/);
    await expect(row.getByRole('cell').nth(3)).toHaveText('Yes');
    expect(await privilegeChanges(userId)).toEqual([
      { privilege: 'admin', change: 'grant', via: 'admin', note: 'Curates the planets' },
      { privilege: 'create_workspace', change: 'grant', via: 'admin', note: 'Curates the planets' },
    ]);

    // And revoked again, behind its own red modal; the flag stays.
    await row.getByRole('button', { name: 'Revoke admin from Fixture Person' }).click();
    const revoking = page.getByRole('dialog', { name: 'Revoke Admin' });
    await expect(revoking).toContainText('Fixture Person');
    await revoking.getByRole('button', { name: 'Revoke' }).click();
    await expect(revoking).toHaveCount(0);

    await expect(row.getByRole('cell').nth(2)).toHaveText(/^User/);
    await expect(row.getByRole('cell').nth(3)).toHaveText(/^Yes/);
    await expect(row.getByRole('button', { name: 'Grant admin to Fixture Person' })).toBeVisible();
  },
);

// MB.63: the primary admin pauses admin changes, another admin is refused a
// grant while they are paused, and the primary admin resumes them. Every
// admin sees the state in words; only the primary admin's switch works.
test(
  'the primary admin pauses admin changes, another admin is refused a grant, and it resumes',
  { tag: '@story-60' },
  async ({ page }) => {
    const primary = await primaryAdminId(page);
    await signInAs(page, 'paused-grantee@admin-role.test');
    const { userId: other } = await signInAs(
      page,
      'other-admin@admin-role.test',
      ['discord'],
      'admin',
    );
    const list = '/admin/users?query=paused-grantee%40admin-role.test';
    // The page's state while paused, and none while on (the owner's call).
    const status = page.getByRole('main').getByRole('status');

    // Another admin sees the switch, unusable, and why.
    await page.goto(list);
    const unusable = page.getByRole('button', { name: 'Pause Admin Changes' });
    await expect(unusable).toHaveAttribute('aria-disabled', 'true');
    await expect(unusable).toHaveAccessibleDescription(/\S/);
    await expect(status).toHaveCount(0);

    // The primary admin pauses, behind a modal asking first. Scoped to it:
    // the button that opens it has the same name.
    await signInAgainAs(page, primary);
    await page.goto(list);
    await page.getByRole('button', { name: 'Pause Admin Changes' }).click();
    const pausing = page.getByRole('dialog', { name: 'Pause Admin Changes' });
    await pausing.getByRole('button', { name: 'Pause Admin Changes' }).click();
    await expect(pausing).toHaveCount(0);
    await expect(status).toBeVisible();
    await expect(page.getByRole('button', { name: 'Resume Admin Changes' })).toBeEnabled();
    await assertNoAccessibilityViolations(page);

    // The other admin's Grant is locked; tried from the keyboard, it says why
    // and opens nothing. The service refuses the same.
    await signInAgainAs(page, other);
    await page.goto(list);
    await expect(status).toBeVisible();
    const row = page.getByRole('row', { name: /paused-grantee@admin-role\.test/ });
    const grant = row.getByRole('button', { name: 'Grant admin to Fixture Person' });
    await expect(grant).toHaveAttribute('aria-disabled', 'true');
    await expect(grant).toHaveAccessibleDescription(/\S/);
    await grant.focus();
    await page.keyboard.press('Enter');
    await expect(row.getByRole('alert')).toBeVisible();
    await assertNoAccessibilityViolations(page);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(row.getByRole('cell').nth(2)).toHaveText(/^User/);
    // Coven creation's Approve is locked the same way (amended on the owner's call).
    const approve = row.getByRole('button', { name: 'Approve Fixture Person' });
    await expect(approve).toHaveAttribute('aria-disabled', 'true');
    await expect(approve).toHaveAccessibleDescription(/\S/);
    await expect(row.getByRole('cell').nth(3)).toHaveText(/^No/);

    // And the primary admin resumes.
    await signInAgainAs(page, primary);
    await page.goto(list);
    await page.getByRole('button', { name: 'Resume Admin Changes' }).click();
    await expect(page.getByRole('button', { name: 'Pause Admin Changes' })).toBeEnabled();
    await expect(status).toHaveCount(0);
  },
);

test('a signed-in non-admin is refused at /admin/categories with the 403 page', async ({
  page,
}) => {
  await signInAs(page, 'not-an-admin@admin-categories.test');

  const response = await page.goto('/admin/categories?new');

  expect(response?.status()).toBe(403);
  await expect(page.getByRole('heading', { level: 1, name: 'Not Authorized' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

// M5.6: the vocabulary's list, and its modal opened by the address — added
// to, edited and retired from, the list re-read after each.
test(
  'an admin adds, edits and deletes a category in the modal over the list',
  { tag: '@story-18' },
  async ({ page }) => {
    await signInAs(page, 'an-admin@admin-categories.test', ['discord'], 'admin');

    const response = await page.goto('/admin/categories');
    expect(response?.status()).toBe(200);
    // The seeded vocabulary pages 25 at a time, alphabetically.
    await expect(page.getByRole('table').getByRole('row')).toHaveCount(26);

    await page.getByRole('link', { name: 'Add Category' }).click();
    const adding = page.getByRole('dialog', { name: 'Add Category' });
    await expect(adding).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/categories\?new$/);
    await assertNoAccessibilityViolations(page);

    // Escape asks the page to close it: the address loses `?new`.
    await page.keyboard.press('Escape');
    await expect(adding).toHaveCount(0);
    await expect(page).toHaveURL(/\/admin\/categories$/);

    await page.getByRole('link', { name: 'Add Category' }).click();
    await adding.getByRole('textbox', { name: 'Name' }).fill('Aaa Testcraft');
    await adding.getByRole('textbox', { name: 'Description' }).fill('Made by the e2e spec');
    await adding.getByRole('combobox', { name: 'Group' }).click();
    // The modal's own list: the filter's Group box has a list of its own.
    await adding.getByRole('option').first().click();
    await adding.getByRole('button', { name: 'Save Category' }).click();
    await expect(adding).toHaveCount(0);
    // First by name, so on the first page.
    const row = page.getByRole('row', { name: /Aaa Testcraft/ });
    await expect(row).toBeVisible();

    await row.getByRole('link', { name: 'Edit Aaa Testcraft' }).click();
    // An edit dialog is named by its eyebrow and the entry's saved name (MB.115).
    const editing = page.getByRole('dialog', { name: 'Edit Category, Aaa Testcraft', exact: true });
    await expect(page).toHaveURL(/\?edit=aaa-testcraft$/);
    await editing.getByRole('textbox', { name: 'Name' }).fill('Aaa Testcraft Renamed');
    await editing.getByRole('button', { name: 'Save Category' }).click();
    await expect(editing).toHaveCount(0);
    await expect(page.getByRole('row', { name: /Aaa Testcraft Renamed/ })).toBeVisible();

    // A renamed category answers at its new address, under its new name.
    await page.goto('/admin/categories?edit=aaa-testcraft-renamed');
    const renamed = page.getByRole('dialog', {
      name: 'Edit Category, Aaa Testcraft Renamed',
      exact: true,
    });
    await expect(renamed).toBeVisible();
    await assertNoAccessibilityViolations(page);
    await renamed.getByRole('button', { name: 'Delete Category' }).click();
    await renamed.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(renamed).toHaveCount(0);
    await expect(page.getByRole('row', { name: /Aaa Testcraft/ })).toHaveCount(0);
  },
);

test('an admin is told which compendium entries hold a category before it can go', async ({
  page,
}) => {
  await signInAs(page, 'held-admin@admin-categories.test', ['discord'], 'admin');
  // The standard seed files several compendium entries under Protection, Bay Laurel first.
  await page.goto('/admin/categories?edit=protection');
  const editing = page.getByRole('dialog', { name: 'Edit Category, Protection', exact: true });

  await editing.getByRole('button', { name: 'Delete Category' }).click();
  await editing.getByRole('button', { name: 'Delete', exact: true }).click();

  await expect(editing.getByRole('alert')).toContainText('Bay Laurel');
  await expect(editing).toBeVisible();
});

test('a signed-in non-admin is refused at /admin/forms with the 403 page', async ({ page }) => {
  await signInAs(page, 'not-an-admin@admin-forms.test');

  const response = await page.goto('/admin/forms?new');

  expect(response?.status()).toBe(403);
  await expect(page.getByRole('heading', { level: 1, name: 'Not Authorized' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

// M5.6a: the curated form vocabulary in M5.6's page shape — the list, and its
// modal opened by the address, added to, renamed and retired from.
test('an admin adds, renames and deletes a form in the modal over the list', async ({ page }) => {
  await signInAs(page, 'an-admin@admin-forms.test', ['discord'], 'admin');

  const response = await page.goto('/admin/forms');
  expect(response?.status()).toBe(200);
  // The seeded vocabulary pages 25 at a time, alphabetically.
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(26);

  await page.getByRole('link', { name: 'Add Form' }).click();
  const adding = page.getByRole('dialog', { name: 'Add Form' });
  await expect(adding).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/forms\?new$/);
  await expect(adding.getByRole('button', { name: 'Save Form' })).toBeDisabled();
  await assertNoAccessibilityViolations(page);
  await adding.getByRole('textbox', { name: 'Name' }).fill('Aaa Testwort Shard');
  await adding.getByRole('textbox', { name: 'Description' }).fill('Made by the e2e spec');
  await adding.getByRole('combobox', { name: 'Group' }).click();
  await adding.getByRole('option', { name: 'Mineral', exact: true }).click();
  await adding.getByRole('button', { name: 'Save Form' }).click();
  await expect(adding).toHaveCount(0);
  // First by name, so on the first page, with its group beside it.
  const row = page.getByRole('row', { name: /Aaa Testwort Shard/ });
  await expect(row.getByRole('cell', { name: 'Mineral', exact: true })).toBeVisible();

  await row.getByRole('link', { name: 'Edit Aaa Testwort Shard' }).click();
  const editing = page.getByRole('dialog', { name: 'Edit Form, Aaa Testwort Shard', exact: true });
  await expect(editing).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/forms\?edit=aaa-testwort-shard[a-z-]*$/);
  // A rename carries onto the compendium, and Save says so before it is pressed.
  const save = editing.getByRole('button', { name: 'Save Form' });
  await expect(save).toHaveAccessibleDescription('');
  await editing.getByRole('textbox', { name: 'Name' }).fill('Aaa Testwort Sliver');
  await expect(save).toHaveAccessibleDescription(/\S/);
  await assertNoAccessibilityViolations(page);
  await save.click();
  await expect(editing).toHaveCount(0);
  await expect(page.getByRole('row', { name: /Aaa Testwort Shard/ })).toHaveCount(0);
  const renamed = page.getByRole('row', { name: /Aaa Testwort Sliver/ });
  await expect(renamed).toBeVisible();

  // A renamed form answers at its new address, which its Edit links to.
  await renamed.getByRole('link', { name: 'Edit Aaa Testwort Sliver' }).click();
  await expect(page).toHaveURL(/\/admin\/forms\?edit=aaa-testwort-sliver[a-z-]*$/);
  const sliver = page.getByRole('dialog', { name: 'Edit Form, Aaa Testwort Sliver', exact: true });
  await sliver.getByRole('button', { name: 'Delete Form' }).click();
  const confirm = sliver.getByRole('button', { name: 'Delete', exact: true });
  await expect(confirm).toBeVisible();
  await confirm.click();
  await expect(sliver).toHaveCount(0);
  await expect(page.getByRole('row', { name: /Aaa Testwort/ })).toHaveCount(0);
});

test('a signed-in non-admin is refused at /admin/celestial-bodies and /admin/zodiac-signs with the 403 page', async ({
  page,
}) => {
  await signInAs(page, 'not-an-admin@admin-astrology.test');

  for (const path of ['/admin/celestial-bodies?new', '/admin/zodiac-signs?new']) {
    const response = await page.goto(path);

    expect(response?.status()).toBe(403);
    await expect(page.getByRole('heading', { level: 1, name: 'Not Authorized' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
});

// MB.95: the celestial bodies in M5.6a's page shape without the group — the list, and
// its modal opened by the address, added to, renamed and retired from.
test('an admin adds, renames and deletes a celestial body in the modal over the list', async ({
  page,
}) => {
  await signInAs(page, 'an-admin@admin-astrology.test', ['discord'], 'admin');

  // The old address is gone, with no redirect.
  expect((await page.goto('/admin/planets'))?.status()).toBe(404);

  const response = await page.goto('/admin/celestial-bodies');
  expect(response?.status()).toBe(200);
  // The seeded nineteen bodies, on one page.
  await expect(page.getByRole('row').filter({ has: page.getByRole('cell') })).toHaveCount(19);

  await page.getByRole('link', { name: 'Add Celestial Body' }).click();
  const adding = page.getByRole('dialog', { name: 'Add Celestial Body' });
  await expect(adding).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/celestial-bodies\?new$/);
  await assertNoAccessibilityViolations(page);
  await expect(adding.getByRole('button', { name: 'Save Celestial Body' })).toBeDisabled();
  await adding.getByRole('textbox', { name: 'Name' }).fill('Aaa Testwort Star');
  await adding.getByRole('textbox', { name: 'Description' }).fill('Made by the e2e spec');
  await adding.getByRole('button', { name: 'Save Celestial Body' }).click();
  await expect(adding).toHaveCount(0);
  const row = page.getByRole('row', { name: /Aaa Testwort Star/ });
  await expect(row.getByRole('cell', { name: 'Made by the e2e spec' })).toBeVisible();

  await row.getByRole('link', { name: 'Edit Aaa Testwort Star' }).click();
  const editing = page.getByRole('dialog', {
    name: 'Edit Celestial Body, Aaa Testwort Star',
    exact: true,
  });
  await expect(page).toHaveURL(/\/admin\/celestial-bodies\?edit=aaa-testwort-star$/);
  // A rename carries onto the compendium, and Save says so before it is pressed.
  const save = editing.getByRole('button', { name: 'Save Celestial Body' });
  await expect(save).toHaveAccessibleDescription('');
  await editing.getByRole('textbox', { name: 'Name' }).fill('Aaa Testwort Comet');
  await expect(save).toHaveAccessibleDescription(/\S/);
  await assertNoAccessibilityViolations(page);
  await save.click();
  await expect(editing).toHaveCount(0);
  const renamed = page.getByRole('row', { name: /Aaa Testwort Comet/ });
  await expect(renamed).toBeVisible();

  await renamed.getByRole('link', { name: 'Edit Aaa Testwort Comet' }).click();
  const comet = page.getByRole('dialog', {
    name: 'Edit Celestial Body, Aaa Testwort Comet',
    exact: true,
  });
  await comet.getByRole('button', { name: 'Delete Celestial Body' }).click();
  const confirm = comet.getByRole('button', { name: 'Delete', exact: true });
  await expect(confirm).toBeVisible();
  await confirm.click();
  await expect(comet).toHaveCount(0);
  await expect(page.getByRole('row', { name: /Aaa Testwort/ })).toHaveCount(0);
});

// The zodiac page's one flow, since the celestial bodies' CRUD covers the shared
// modal: its list read through the address a filter makes.
test('an admin filters the zodiac signs by part of a name', async ({ page }) => {
  await signInAs(page, 'filter-admin@admin-astrology.test', ['discord'], 'admin');
  const response = await page.goto('/admin/zodiac-signs');
  expect(response?.status()).toBe(200);
  const search = page.getByRole('search');
  const searchButton = search.getByRole('button', { name: 'Search' });
  const rows = page.getByRole('row').filter({ has: page.getByRole('cell') });
  await expect(rows).toHaveCount(13);
  await expect(search.getByRole('combobox')).toHaveCount(0);

  // Aries, Sagittarius and Aquarius hold "ar".
  await search.getByRole('searchbox', { name: 'Name' }).fill('AR');
  await searchButton.click();
  await expect(page).toHaveURL(/\/admin\/zodiac-signs\?query=AR$/);
  await expect(rows).toHaveCount(3);
  await expect(page.getByRole('link', { name: 'Edit Aries' })).toHaveAttribute(
    'href',
    '/admin/zodiac-signs?query=AR&edit=aries',
  );
  await assertNoAccessibilityViolations(page);

  await search.getByRole('searchbox', { name: 'Name' }).fill('no such sign');
  await searchButton.click();
  // The address first: while the list is on its way its skeleton stands in,
  // which has no table either, so the count alone would pass at once.
  await expect(page).toHaveURL(/\/admin\/zodiac-signs\?query=no\+such\+sign$/);
  await expect(page.getByRole('table')).toHaveCount(0);
});

test('a signed-in non-admin is refused at both group pages with the 403 page', async ({ page }) => {
  await signInAs(page, 'not-an-admin@admin-groups.test');

  for (const path of ['/admin/category-groups?new', '/admin/form-groups?new']) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(403);
    await expect(page.getByRole('heading', { level: 1, name: 'Not Authorized' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
});

// M5.6b: a category group's colours held to 4.5:1 on their own grounds, and a
// group deleted only once its categories have moved to one the admin picks.
test('an admin adds a category group, is refused a colour too dark for its ground, and moves its category before deleting it', async ({
  page,
}) => {
  await signInAs(page, 'an-admin@admin-groups.test', ['discord'], 'admin');

  const response = await page.goto('/admin/category-groups');
  expect(response?.status()).toBe(200);
  // The seeded eight, each drawn in its own chip.
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(9);

  await page.getByRole('link', { name: 'Add Group' }).click();
  const adding = page.getByRole('dialog', { name: 'Add Category Group' });
  await expect(page).toHaveURL(/\/admin\/category-groups\?new$/);
  await adding.getByRole('textbox', { name: 'Name' }).fill('Aaa Testwort Wards');
  await adding.getByRole('textbox', { name: 'Description' }).fill('Made by the e2e spec');
  // A light-theme ink, far too dark for the dark card.
  const dark = adding.getByRole('textbox', { name: 'Dark Theme Colour', exact: true });
  await dark.fill('#0c5393');
  await adding.getByRole('textbox', { name: 'Light Theme Colour', exact: true }).fill('#0c5393');
  await adding.getByRole('button', { name: 'Save Group' }).click();
  // Refused with the ratio it reads, then accepted with the ratio it reads now.
  await expect(dark).toHaveAccessibleDescription(/2\.16:1/);
  await dark.fill('#4e8bc2');
  await expect(adding.getByText(/4\.68:1/)).toBeVisible();
  await assertNoAccessibilityViolations(page);
  await adding.getByRole('button', { name: 'Save Group' }).click();
  await expect(adding).toHaveCount(0);
  await expect(page.getByRole('row', { name: /Aaa Testwort Wards/ })).toBeVisible();

  // A category filed under it, so the delete has something to move.
  await page.goto('/admin/categories?new');
  const category = page.getByRole('dialog', { name: 'Add Category' });
  await category.getByRole('textbox', { name: 'Name' }).fill('Aaa Testcraft Moved');
  await category.getByRole('textbox', { name: 'Description' }).fill('Made by the e2e spec');
  await category.getByRole('combobox', { name: 'Group' }).click();
  await category.getByRole('option', { name: 'Aaa Testwort Wards' }).click();
  await category.getByRole('button', { name: 'Save Category' }).click();
  await expect(category).toHaveCount(0);

  await page.goto('/admin/category-groups?edit=aaa-testwort-wards');
  const editing = page.getByRole('dialog', {
    name: 'Edit Category Group, Aaa Testwort Wards',
    exact: true,
  });
  await editing.getByRole('button', { name: 'Delete Group' }).click();
  // The question over the form, its picker inside it.
  await editing.getByRole('combobox', { name: 'Move Its 1 Category To' }).click();
  await editing.getByRole('option', { name: 'Cleansing & Release' }).click();
  await editing.getByRole('button', { name: 'Continue' }).click();
  const moveAndDelete = editing.getByRole('button', { name: 'Move and Delete' });
  await expect(moveAndDelete).toBeVisible();
  await assertNoAccessibilityViolations(page);
  await moveAndDelete.click();
  await expect(editing).toHaveCount(0);
  await expect(page.getByRole('row', { name: /Aaa Testwort Wards/ })).toHaveCount(0);

  await page.goto('/admin/categories?query=Aaa+Testcraft+Moved');
  await expect(
    page
      .getByRole('row', { name: /Aaa Testcraft Moved/ })
      .getByRole('cell', { name: 'Cleansing & Release' }),
  ).toBeVisible();
});

test('an admin adds, renames and deletes a form group', async ({ page }) => {
  await signInAs(page, 'form-admin@admin-groups.test', ['discord'], 'admin');

  const response = await page.goto('/admin/form-groups?new');
  expect(response?.status()).toBe(200);
  const adding = page.getByRole('dialog', { name: 'Add Form Group' });
  await expect(adding).toBeVisible();
  // A form group carries no colours.
  await expect(adding.getByRole('textbox', { name: 'Dark Theme Colour', exact: true })).toHaveCount(
    0,
  );
  await adding.getByRole('textbox', { name: 'Name' }).fill('Aaa Fixture Matter');
  await adding.getByRole('textbox', { name: 'Description' }).fill('Made by the e2e spec');
  const save = adding.getByRole('button', { name: 'Save Group' });
  await expect(save).toBeEnabled();
  await assertNoAccessibilityViolations(page);
  await save.click();
  await expect(adding).toHaveCount(0);

  await page.getByRole('link', { name: 'Edit Aaa Fixture Matter' }).click();
  const editing = page.getByRole('dialog', {
    name: 'Edit Form Group, Aaa Fixture Matter',
    exact: true,
  });
  await editing.getByRole('textbox', { name: 'Name' }).fill('Aaa Fixture Stuff');
  await editing.getByRole('button', { name: 'Save Group' }).click();
  await expect(editing).toHaveCount(0);
  await expect(page.getByRole('row', { name: /Aaa Fixture Stuff/ })).toBeVisible();

  await page.goto('/admin/form-groups?edit=aaa-fixture-stuff');
  const renamed = page.getByRole('dialog', {
    name: 'Edit Form Group, Aaa Fixture Stuff',
    exact: true,
  });
  await renamed.getByRole('button', { name: 'Delete Group' }).click();
  const confirm = renamed.getByRole('button', { name: 'Delete', exact: true });
  await expect(confirm).toBeVisible();
  await confirm.click();
  await expect(renamed).toHaveCount(0);
  await expect(page.getByRole('row', { name: /Aaa Fixture/ })).toHaveCount(0);
});

test('a signed-in non-admin is refused at both deity pages with the 403 page', async ({ page }) => {
  await signInAs(page, 'not-an-admin@admin-deities.test');

  for (const path of ['/admin/deities?new', '/admin/deity-traditions?new']) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(403);
    await expect(page.getByRole('heading', { level: 1, name: 'Not Authorized' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
});

// MB.132: both deity pages in one flow. A deity is added under a new
// tradition; the tradition's rename re-slugs it, and the tradition's delete
// moves it to the one the admin picks, re-slugged there.
test('an admin adds and renames a tradition, then moves its deity before deleting it', async ({
  page,
}) => {
  await signInAs(page, 'tradition-admin@admin-deities.test', ['discord'], 'admin');

  const response = await page.goto('/admin/deity-traditions?new');
  expect(response?.status()).toBe(200);
  const adding = page.getByRole('dialog', { name: 'Add Tradition' });
  await adding.getByRole('textbox', { name: 'Name' }).fill('Aaa Fixtural');
  await adding.getByRole('textbox', { name: 'Description' }).fill('Made by the e2e spec');
  const saveTradition = adding.getByRole('button', { name: 'Save Tradition' });
  await expect(saveTradition).toBeEnabled();
  await assertNoAccessibilityViolations(page);
  await saveTradition.click();
  await expect(adding).toHaveCount(0);

  await page.goto('/admin/deities?new');
  const deity = page.getByRole('dialog', { name: 'Add Deity' });
  await deity.getByRole('textbox', { name: 'Name' }).fill('Aaa Testra');
  await deity.getByRole('textbox', { name: 'Description' }).fill('Filed under the tradition');
  await deity.getByRole('combobox', { name: 'Tradition' }).click();
  await deity.getByRole('option', { name: 'Aaa Fixtural', exact: true }).click();
  // A type-ahead box: the pick is its text.
  await expect(deity.getByRole('combobox', { name: 'Tradition' })).toHaveValue('Aaa Fixtural');
  await assertNoAccessibilityViolations(page);
  await deity.getByRole('button', { name: 'Save Deity' }).click();
  await expect(deity).toHaveCount(0);

  await page.goto('/admin/deity-traditions?edit=aaa-fixtural');
  const editing = page.getByRole('dialog', { name: 'Edit Tradition, Aaa Fixtural', exact: true });
  await editing.getByRole('textbox', { name: 'Name' }).fill('Aaa Mockish');
  await editing.getByRole('button', { name: 'Save Tradition' }).click();
  await expect(editing).toHaveCount(0);
  // The deity's address followed its tradition's name, as its dialog's
  // qualifier does.
  await page.goto('/admin/deities?edit=aaa-testra-aaa-mockish');
  await expect(
    page
      .getByRole('dialog', { name: 'Edit Deity, Aaa Testra, Aaa Mockish', exact: true })
      .getByRole('textbox', { name: 'Name' }),
  ).toHaveValue('Aaa Testra');

  await page.goto('/admin/deity-traditions?edit=aaa-mockish');
  const renamed = page.getByRole('dialog', { name: 'Edit Tradition, Aaa Mockish', exact: true });
  await renamed.getByRole('button', { name: 'Delete Tradition' }).click();
  await renamed.getByRole('combobox', { name: 'Move Its 1 Deity To' }).click();
  await renamed.getByRole('option', { name: 'Greek', exact: true }).click();
  await renamed.getByRole('button', { name: 'Continue' }).click();
  await renamed.getByRole('button', { name: 'Move and Delete' }).click();
  await expect(renamed).toHaveCount(0);
  await expect(page.getByRole('row', { name: /Aaa Mockish/ })).toHaveCount(0);

  await page.goto('/admin/deities?edit=aaa-testra-greek');
  const moved = page.getByRole('dialog', { name: 'Edit Deity, Aaa Testra, Greek', exact: true });
  await expect(moved.getByRole('combobox', { name: 'Tradition' })).toHaveValue('Greek');
  await moved.getByRole('button', { name: 'Delete Deity' }).click();
  await moved.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(moved).toHaveCount(0);
});
