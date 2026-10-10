import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import postgres from 'postgres';
import { e2eDatabaseUrl, recreateE2eDatabase } from './database';
import { PRIMARY_ADMIN_EMAIL, signInAgainAs, signInAs } from './session';

// The `/admin` guard against the built server (M5.4; claude-docs/auth/admin-guard.md, "The
// admin guard"): a signed-out visitor is sent to sign in, a signed-in
// non-admin is refused with a 403 page, and an admin sees the layout.
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

const PRIMARY_ADMIN_REASON =
  "This is the primary admin and can't be removed. Changing who the primary admin is takes a change to the site's configuration.";

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

test('a signed-out visit to /admin lands on /sign-in, keeping its path', async ({ page }) => {
  await page.goto('/admin?tab=forms');

  const url = new URL(page.url());
  expect(url.pathname).toBe('/sign-in');
  expect(url.searchParams.get('next')).toBe('/admin?tab=forms');
});

test('a signed-in non-admin is refused at /admin with a 403 page that says why', async ({
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

  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 1, name: 'Not Authorized' })).toBeVisible();
  await expect(main.getByText(/does not have admin rights/)).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Admin' })).toHaveCount(0);
  await assertNoAccessibilityViolations(page);
});

test('an admin sees the admin layout and its nav', async ({ page }) => {
  await signInAs(page, 'an-admin@admin-guard.test', ['discord'], 'admin');

  const response = await page.goto('/admin');

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle('Admin — Sorrel & Salt');
  await expect(page.getByRole('heading', { level: 1, name: 'Admin' })).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Admin' });
  for (const [name, href] of [
    ['Compendium', '/admin/compendium'],
    ['Categories', '/admin/categories'],
    ['Category groups', '/admin/category-groups'],
    ['Forms', '/admin/forms'],
    ['Form groups', '/admin/form-groups'],
    ['Planets', '/admin/planets'],
    ['Zodiac signs', '/admin/zodiac-signs'],
    ['Deities', '/admin/deities'],
    ['Deity traditions', '/admin/deity-traditions'],
  ]) {
    await expect(nav.getByRole('link', { name })).toHaveAttribute('href', href);
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
  await expect(page).toHaveTitle('Users — Admin — Sorrel & Salt');
  await expect(page.getByRole('heading', { level: 1, name: 'Users' })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Users' }),
  ).toHaveAttribute('href', '/admin/users');
  await expect(page.getByRole('search').getByLabel('Name or Email')).toHaveValue(
    'admin-users.test',
  );

  // The filter's two matches, and nothing from admin-guard.test's earlier sign-ins.
  const rows = page.getByRole('row').filter({ has: page.getByRole('cell') });
  await expect(rows).toHaveCount(2);
  // Anchored on the name and the verified mark's word before it:
  // not-an-admin's address ends the same way.
  const admin = page.getByRole('row', {
    name: /Fixture Person Verified an-admin@admin-users\.test/,
  });
  await expect(admin.getByRole('cell')).toHaveText([
    'Fixture Person',
    // The verified mark's word, for the reader and in its tip, before the address.
    /an-admin@admin-users\.test$/,
    // The role, then the control that changes it (MB.59).
    'AdminRevoke',
    // Each logo's name, for the reader and in its tip.
    'DiscordDiscordGoogleGoogle',
    /^\d{4}-\d{2}-\d{2}$/,
    // A mark alone: every admin may create a workspace, and the users CHECK
    // says so (MB.177), so the cell offers no control.
    'Yes',
  ]);
  // The mark says what it marks on hover, in a tip bubble (the owner's review).
  const email = admin.getByRole('cell').nth(1);
  const tip = email.locator('.user-list__tip');
  await expect(tip).toBeHidden();
  await email.locator('.user-list__mark').hover();
  await expect(tip).toBeVisible();
  await expect(tip).toHaveText('Verified');
  // So does each sign-in logo, its provider's name.
  const discord = admin.getByRole('cell').nth(3).locator('.user-list__provider--discord');
  await discord.hover();
  await expect(discord.locator('.user-list__tip')).toBeVisible();
  await expect(discord.locator('.user-list__tip')).toHaveText('Discord');
  await assertNoAccessibilityViolations(page);
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
  await expect(row.getByRole('cell').nth(5)).toHaveText(/^No/);

  await row.getByRole('button', { name: 'Approve Fixture Person' }).click();
  const approving = page.getByRole('dialog', { name: 'Approve Coven Creation' });
  await expect(approving).toContainText('Let Fixture Person create covens?');
  await expect(approving.getByRole('button', { name: 'Approve' })).toBeFocused();
  // A verified address, so no warning (MB.205).
  await expect(approving).not.toContainText('has not been verified');
  // An optional reason, as Grant and Revoke of admin take one.
  await approving.getByRole('textbox', { name: 'Reason' }).fill('Runs the Tuesday circle');
  await assertNoAccessibilityViolations(page);

  await approving.getByRole('button', { name: 'Approve' }).click();
  await expect(approving).toHaveCount(0);

  await expect(row.getByRole('cell').nth(5)).toHaveText(/^Yes/);
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
  await expect(revoking).toContainText(
    'Stop Fixture Person from creating covens? Covens they own stay theirs.',
  );
  await revoking.getByRole('button', { name: 'Revoke' }).click();
  await expect(revoking).toHaveCount(0);

  await expect(row.getByRole('cell').nth(5)).toHaveText(/^No/);
  await expect(row.getByRole('button', { name: 'Approve Fixture Person' })).toBeVisible();
});

// MB.205: approving a user whose address is unverified warns that nobody has
// proved who holds it and that approving keeps the account, read with the
// modal's Approve, and still approves.
test('an admin approves an unverified user at /admin/users through the warning', async ({
  page,
}) => {
  await signInAs(page, 'unverified@admin-approval.test', ['discord'], 'user', {
    emailVerified: false,
  });
  await signInAs(page, 'another-admin@admin-approval.test', ['discord'], 'admin');

  const response = await page.goto('/admin/users?query=unverified%40admin-approval.test');
  expect(response?.status()).toBe(200);
  const row = page.getByRole('row', { name: /unverified@admin-approval\.test/ });
  // The precondition: the address is unverified and the user awaits approval.
  await expect(row.getByRole('cell').nth(1)).toHaveText(/^Unverified/);
  await expect(row.getByRole('cell').nth(5)).toHaveText(/^No/);

  await row.getByRole('button', { name: 'Approve Fixture Person' }).click();
  const approving = page.getByRole('dialog', { name: 'Approve Coven Creation' });
  const warning =
    'This email address has not been verified, so nobody has proved who holds it. Approving keeps the account rather than letting it lapse.';
  await expect(approving).toContainText('Let Fixture Person create covens?');
  await expect(approving).toContainText(warning);
  const approve = approving.getByRole('button', { name: 'Approve' });
  await expect(approve).toBeFocused();
  await expect(approve).toHaveAccessibleDescription(warning);
  await assertNoAccessibilityViolations(page);

  await approve.click();
  await expect(approving).toHaveCount(0);

  await expect(row.getByRole('cell').nth(5)).toHaveText(/^Yes/);
  await expect(
    row.getByRole('button', { name: 'Revoke approval for Fixture Person' }),
  ).toBeVisible();
});

// MB.59: an admin grants admin to a user from their row, behind a modal naming
// them with an optional reason the ledger keeps, and then revokes it.
test('an admin grants admin to a user at /admin/users with a reason, then revokes it', async ({
  page,
}) => {
  const { userId } = await signInAs(page, 'grantee@admin-role.test');
  await signInAs(page, 'an-admin@admin-role.test', ['discord'], 'admin');

  const response = await page.goto('/admin/users?query=grantee%40admin-role.test');
  expect(response?.status()).toBe(200);
  const row = page.getByRole('row', { name: /grantee@admin-role\.test/ });
  await expect(row.getByRole('cell').nth(2)).toHaveText(/^User/);
  await expect(row.getByRole('cell').nth(5)).toHaveText(/^No/);

  await row.getByRole('button', { name: 'Grant admin to Fixture Person' }).click();
  const granting = page.getByRole('dialog', { name: 'Grant Admin' });
  await expect(granting).toContainText('Make Fixture Person an admin?');
  await expect(granting.getByRole('button', { name: 'Grant' })).toBeFocused();
  // A verified address, so no warning (MB.205).
  await expect(granting).not.toContainText('has not been verified');
  await granting.getByRole('textbox', { name: 'Reason' }).fill('Curates the planets');
  await assertNoAccessibilityViolations(page);

  await granting.getByRole('button', { name: 'Grant' }).click();
  await expect(granting).toHaveCount(0);

  // An admin now, who may create a coven, so the creation cell holds the mark alone.
  await expect(row.getByRole('cell').nth(2)).toHaveText(/^Admin/);
  await expect(row.getByRole('cell').nth(5)).toHaveText('Yes');
  expect(await privilegeChanges(userId)).toEqual([
    { privilege: 'admin', change: 'grant', via: 'admin', note: 'Curates the planets' },
    { privilege: 'create_workspace', change: 'grant', via: 'admin', note: 'Curates the planets' },
  ]);

  // And revoked again, behind its own red modal; the flag stays.
  await row.getByRole('button', { name: 'Revoke admin from Fixture Person' }).click();
  const revoking = page.getByRole('dialog', { name: 'Revoke Admin' });
  await expect(revoking).toContainText('Stop Fixture Person being an admin?');
  await revoking.getByRole('button', { name: 'Revoke' }).click();
  await expect(revoking).toHaveCount(0);

  await expect(row.getByRole('cell').nth(2)).toHaveText(/^User/);
  await expect(row.getByRole('cell').nth(5)).toHaveText(/^Yes/);
  await expect(row.getByRole('button', { name: 'Grant admin to Fixture Person' })).toBeVisible();
});

// MB.59: the address ADMIN_BOOTSTRAP_EMAIL names is labelled, and its Revoke
// stays in view but cannot be used, saying why when it is tried.
test('the primary admin’s row is labelled, and its Revoke says why it cannot be used', async ({
  page,
}) => {
  await signInAs(page, PRIMARY_ADMIN_EMAIL, ['google'], 'admin');
  await signInAs(page, 'another-admin@admin-role.test', ['discord'], 'admin');

  const response = await page.goto('/admin/users?role=admin&query=admin-bootstrap.invalid');
  expect(response?.status()).toBe(200);
  const row = page.getByRole('row', { name: /admin-bootstrap\.invalid/ });
  await expect(row.getByText('Primary Admin', { exact: true })).toBeVisible();
  const revoke = row.getByRole('button', { name: 'Revoke admin from Fixture Person' });
  await expect(revoke).toHaveAttribute('aria-disabled', 'true');
  await expect(revoke).toHaveAccessibleDescription(PRIMARY_ADMIN_REASON);
  await expect(row.getByText(PRIMARY_ADMIN_REASON)).toBeVisible();
  await assertNoAccessibilityViolations(page);

  // From the keyboard: it stays in the tab order, and Playwright's click
  // waits for an enabled control, which an `aria-disabled` one never is.
  await revoke.focus();
  await page.keyboard.press('Enter');

  await expect(row.getByRole('alert')).toHaveText(PRIMARY_ADMIN_REASON);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(row.getByRole('cell').nth(2)).toHaveText(/^Admin/);
});

// MB.63: the primary admin pauses admin changes, another admin is refused a
// grant while they are paused, and the primary admin resumes them. Every
// admin sees the state in words; only the primary admin's switch works.
test('the primary admin pauses admin changes, another admin is refused a grant, and it resumes', async ({
  page,
}) => {
  const primary = await primaryAdminId(page);
  await signInAs(page, 'paused-grantee@admin-role.test');
  const { userId: other } = await signInAs(
    page,
    'other-admin@admin-role.test',
    ['discord'],
    'admin',
  );
  const list = '/admin/users?query=paused-grantee%40admin-role.test';
  const status = page.getByRole('main').getByText(/^Admin changes are (on|paused):/);
  const PAUSED = /^Admin changes are paused:/;

  // Another admin sees the switch, unusable, and why.
  await page.goto(list);
  await expect(status).toHaveText(/^Admin changes are on/);
  const unusable = page.getByRole('button', { name: 'Pause Admin Changes' });
  await expect(unusable).toHaveAttribute('aria-disabled', 'true');
  await expect(unusable).toHaveAccessibleDescription(
    'Only the primary admin can pause or resume admin changes.',
  );

  // The primary admin pauses.
  await signInAgainAs(page, primary);
  await page.goto(list);
  await page.getByRole('button', { name: 'Pause Admin Changes' }).click();
  await expect(status).toHaveText(PAUSED);
  await expect(page.getByRole('button', { name: 'Resume Admin Changes' })).toBeEnabled();
  await assertNoAccessibilityViolations(page);

  // The other admin's grant is refused, in words that name nobody.
  await signInAgainAs(page, other);
  await page.goto(list);
  await expect(status).toHaveText(PAUSED);
  const row = page.getByRole('row', { name: /paused-grantee@admin-role\.test/ });
  await row.getByRole('button', { name: 'Grant admin to Fixture Person' }).click();
  await page
    .getByRole('dialog', { name: 'Grant Admin' })
    .getByRole('button', { name: 'Grant' })
    .click();
  await expect(row.getByRole('alert')).toHaveText(
    'Admin changes are paused, so no one can be made an admin or stop being one until they are resumed.',
  );
  await expect(row.getByRole('cell').nth(2)).toHaveText(/^User/);

  // And the primary admin resumes.
  await signInAgainAs(page, primary);
  await page.goto(list);
  await page.getByRole('button', { name: 'Resume Admin Changes' }).click();
  await expect(status).toHaveText(/^Admin changes are on/);
});

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
test('an admin adds, edits and deletes a category in the modal over the list', async ({ page }) => {
  await signInAs(page, 'an-admin@admin-categories.test', ['discord'], 'admin');

  const response = await page.goto('/admin/categories');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle('Categories — Admin — Sorrel & Salt');
  await expect(page.getByRole('heading', { level: 1, name: 'Categories' })).toBeVisible();
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
  // The modal's own list: the filter's Group is a native select with options too.
  await adding.getByRole('option').first().click();
  await adding.getByRole('button', { name: 'Save Category' }).click();
  await expect(adding).toHaveCount(0);
  // First by name, so on the first page.
  const row = page.getByRole('row', { name: /Aaa Testcraft/ });
  await expect(row).toBeVisible();

  await row.getByRole('link', { name: 'Edit Aaa Testcraft' }).click();
  const editing = page.getByRole('dialog', { name: 'Edit Category' });
  await expect(page).toHaveURL(/\?edit=aaa-testcraft$/);
  await editing.getByRole('textbox', { name: 'Name' }).fill('Aaa Testcraft Renamed');
  await editing.getByRole('button', { name: 'Save Category' }).click();
  await expect(editing).toHaveCount(0);
  await expect(page.getByRole('row', { name: /Aaa Testcraft Renamed/ })).toBeVisible();

  // A renamed category answers at its new address.
  await page.goto('/admin/categories?edit=aaa-testcraft-renamed');
  await expect(editing).toBeVisible();
  await assertNoAccessibilityViolations(page);
  await editing.getByRole('button', { name: 'Delete Category' }).click();
  await editing.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(editing).toHaveCount(0);
  await expect(page.getByRole('row', { name: /Aaa Testcraft/ })).toHaveCount(0);
});

// MB.178: the list narrows by part of a name and by a group, a filtered page
// is an address, and the links on it keep the filter.
test('an admin filters the categories by part of a name and by a group', async ({ page }) => {
  await signInAs(page, 'filter-admin@admin-categories.test', ['discord'], 'admin');
  await page.goto('/admin/categories');
  const search = page.getByRole('search');
  const filter = search.getByRole('button', { name: 'Filter' });
  const rows = page.getByRole('row').filter({ has: page.getByRole('cell') });
  await expect(filter).toBeDisabled();

  // Seven seeded categories end in "Work", matched whatever the case.
  await search.getByRole('searchbox', { name: 'Name' }).fill('work');
  await filter.click();
  await expect(page).toHaveURL(/\/admin\/categories\?query=work$/);
  await expect(rows).toHaveCount(7);
  await expect(filter).toBeDisabled();

  // Two of them are filed under Mind & Spirit.
  await search.getByRole('combobox', { name: 'Group' }).selectOption({ label: 'Mind & Spirit' });
  await filter.click();
  await expect(page).toHaveURL(/\/admin\/categories\?query=work&group=mind-and-spirit$/);
  await expect(rows).toHaveCount(2);
  await expect(page.getByRole('row', { name: /Dream Work/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /Psychic Work/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Edit Dream Work' })).toHaveAttribute(
    'href',
    '/admin/categories?query=work&group=mind-and-spirit&edit=dream-work',
  );
  await assertNoAccessibilityViolations(page);

  await search.getByRole('searchbox', { name: 'Name' }).fill('no such category');
  await filter.click();
  await expect(page.getByText('No category matches.')).toBeVisible();
});

test('an admin is told which compendium entries hold a category before it can go', async ({
  page,
}) => {
  await signInAs(page, 'held-admin@admin-categories.test', ['discord'], 'admin');
  // The standard seed files several compendium entries under Protection, Bay Laurel first.
  await page.goto('/admin/categories?edit=protection');
  const editing = page.getByRole('dialog', { name: 'Edit Category' });

  await editing.getByRole('button', { name: 'Delete Category' }).click();
  await editing.getByRole('button', { name: 'Delete', exact: true }).click();

  await expect(editing.getByRole('alert')).toContainText(
    /^"Protection" is filed on \d+ compendium entries — Bay Laurel \(.+\), .+\. Take it off them first\.$/,
  );
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
  await expect(page).toHaveTitle('Forms — Admin — Sorrel & Salt');
  await expect(page.getByRole('heading', { level: 1, name: 'Forms' })).toBeVisible();
  // The seeded vocabulary pages 25 at a time, alphabetically.
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(26);
  await expect(page.getByRole('navigation', { name: 'Pages' })).toContainText(/Page 1 of \d+/);

  await page.getByRole('link', { name: 'Add Form' }).click();
  const adding = page.getByRole('dialog', { name: 'Add Form' });
  await expect(adding).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/forms\?new$/);
  await assertNoAccessibilityViolations(page);

  // Escape asks the page to close it: the address loses `?new`.
  await page.keyboard.press('Escape');
  await expect(adding).toHaveCount(0);
  await expect(page).toHaveURL(/\/admin\/forms$/);

  await page.getByRole('link', { name: 'Add Form' }).click();
  await expect(adding.getByRole('button', { name: 'Save Form' })).toBeDisabled();
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
  const editing = page.getByRole('dialog', { name: 'Edit Form' });
  await expect(editing).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/forms\?edit=aaa-testwort-shard[a-z-]*$/);
  // A rename carries onto the compendium, and says so before it is saved.
  const note = editing.getByText(/^Saving renames it on every compendium entry that picked it/);
  await expect(note).toHaveCount(0);
  await editing.getByRole('textbox', { name: 'Name' }).fill('Aaa Testwort Sliver');
  await expect(note).toBeVisible();
  await assertNoAccessibilityViolations(page);
  await editing.getByRole('button', { name: 'Save Form' }).click();
  await expect(editing).toHaveCount(0);
  await expect(page.getByRole('row', { name: /Aaa Testwort Shard/ })).toHaveCount(0);
  const renamed = page.getByRole('row', { name: /Aaa Testwort Sliver/ });
  await expect(renamed).toBeVisible();

  // A renamed form answers at its new address, which its Edit links to.
  await renamed.getByRole('link', { name: 'Edit Aaa Testwort Sliver' }).click();
  await expect(page).toHaveURL(/\/admin\/forms\?edit=aaa-testwort-sliver[a-z-]*$/);
  await editing.getByRole('button', { name: 'Delete Form' }).click();
  await expect(editing.getByText(/^Delete "Aaa Testwort Sliver"\?/)).toBeVisible();
  await editing.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(editing).toHaveCount(0);
  await expect(page.getByRole('row', { name: /Aaa Testwort/ })).toHaveCount(0);
});

// The list narrows by part of a name and by a group, as the categories' does
// (MB.178): a filtered page is an address, and the links on it keep the filter.
test('an admin filters the forms by part of a name and by a group', async ({ page }) => {
  await signInAs(page, 'filter-admin@admin-forms.test', ['discord'], 'admin');
  await page.goto('/admin/forms');
  const search = page.getByRole('search');
  const filter = search.getByRole('button', { name: 'Filter' });
  const rows = page.getByRole('row').filter({ has: page.getByRole('cell') });
  await expect(filter).toBeDisabled();

  // Five seeded forms hold "ea", Earth's matched whatever the case.
  await search.getByRole('searchbox', { name: 'Name' }).fill('ea');
  await filter.click();
  await expect(page).toHaveURL(/\/admin\/forms\?query=ea$/);
  await expect(rows).toHaveCount(5);
  await expect(page.getByRole('row', { name: /Earth/ })).toBeVisible();
  await expect(filter).toBeDisabled();

  // Two of them are filed under Animal.
  await search.getByRole('combobox', { name: 'Group' }).selectOption({ label: 'Animal' });
  await filter.click();
  await expect(page).toHaveURL(/\/admin\/forms\?query=ea&group=animal$/);
  await expect(rows).toHaveCount(2);
  await expect(page.getByRole('row', { name: /Feather/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /Pearl/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Edit Feather' })).toHaveAttribute(
    'href',
    '/admin/forms?query=ea&group=animal&edit=feather-animal',
  );
  await assertNoAccessibilityViolations(page);

  await search.getByRole('searchbox', { name: 'Name' }).fill('no such form');
  await filter.click();
  await expect(page.getByText('No form matches.')).toBeVisible();
});

test('an admin is told which compendium entries pick a form before it can go', async ({ page }) => {
  await signInAs(page, 'held-admin@admin-forms.test', ['discord'], 'admin');
  // The standard seed's Ginger and Devil's Shoestring pick the curated Root, filed under Botanical.
  await page.goto('/admin/forms?edit=root-botanical');
  const editing = page.getByRole('dialog', { name: 'Edit Form' });
  await expect(editing.getByRole('textbox', { name: 'Name' })).toHaveValue('Root');

  await editing.getByRole('button', { name: 'Delete Form' }).click();
  await editing.getByRole('button', { name: 'Delete', exact: true }).click();

  await expect(editing.getByRole('alert')).toContainText(
    /^"Root" is the form of \d+ compendium entries — .+\. Change their form first\.$/,
  );
  await expect(editing).toBeVisible();
  // Still live: its address still opens it.
  await page.goto('/admin/forms?edit=root-botanical');
  await expect(editing).toBeVisible();
});

test('a signed-in non-admin is refused at /admin/planets and /admin/zodiac-signs with the 403 page', async ({
  page,
}) => {
  await signInAs(page, 'not-an-admin@admin-astrology.test');

  for (const path of ['/admin/planets?new', '/admin/zodiac-signs?new']) {
    const response = await page.goto(path);

    expect(response?.status()).toBe(403);
    await expect(page.getByRole('heading', { level: 1, name: 'Not Authorized' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
});

// MB.95: the planets in M5.6a's page shape without the group — the list, and
// its modal opened by the address, added to, renamed and retired from.
test('an admin adds, renames and deletes a planet in the modal over the list', async ({ page }) => {
  await signInAs(page, 'an-admin@admin-astrology.test', ['discord'], 'admin');

  const response = await page.goto('/admin/planets');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle('Planets — Admin — Sorrel & Salt');
  await expect(page.getByRole('heading', { level: 1, name: 'Planets' })).toBeVisible();
  // The seeded nineteen bodies, on one page.
  await expect(page.getByRole('row').filter({ has: page.getByRole('cell') })).toHaveCount(19);

  await page.getByRole('link', { name: 'Add Planet' }).click();
  const adding = page.getByRole('dialog', { name: 'Add Planet' });
  await expect(adding).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/planets\?new$/);
  await assertNoAccessibilityViolations(page);
  await expect(adding.getByRole('button', { name: 'Save Planet' })).toBeDisabled();
  await adding.getByRole('textbox', { name: 'Name' }).fill('Aaa Testwort Star');
  await adding.getByRole('textbox', { name: 'Description' }).fill('Made by the e2e spec');
  await adding.getByRole('button', { name: 'Save Planet' }).click();
  await expect(adding).toHaveCount(0);
  const row = page.getByRole('row', { name: /Aaa Testwort Star/ });
  await expect(row.getByRole('cell', { name: 'Made by the e2e spec' })).toBeVisible();

  await row.getByRole('link', { name: 'Edit Aaa Testwort Star' }).click();
  const editing = page.getByRole('dialog', { name: 'Edit Planet' });
  await expect(page).toHaveURL(/\/admin\/planets\?edit=aaa-testwort-star$/);
  // A rename carries onto the compendium, and says so before it is saved.
  const note = editing.getByText('Saving renames it on every compendium entry that lists it.');
  await expect(note).toHaveCount(0);
  await editing.getByRole('textbox', { name: 'Name' }).fill('Aaa Testwort Comet');
  await expect(note).toBeVisible();
  await assertNoAccessibilityViolations(page);
  await editing.getByRole('button', { name: 'Save Planet' }).click();
  await expect(editing).toHaveCount(0);
  const renamed = page.getByRole('row', { name: /Aaa Testwort Comet/ });
  await expect(renamed).toBeVisible();

  await renamed.getByRole('link', { name: 'Edit Aaa Testwort Comet' }).click();
  await editing.getByRole('button', { name: 'Delete Planet' }).click();
  await expect(editing.getByText(/^Delete "Aaa Testwort Comet"\?/)).toBeVisible();
  await editing.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(editing).toHaveCount(0);
  await expect(page.getByRole('row', { name: /Aaa Testwort/ })).toHaveCount(0);
});

test('an admin filters the zodiac signs by part of a name', async ({ page }) => {
  await signInAs(page, 'filter-admin@admin-astrology.test', ['discord'], 'admin');
  const response = await page.goto('/admin/zodiac-signs');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle('Zodiac Signs — Admin — Sorrel & Salt');
  const search = page.getByRole('search');
  const filter = search.getByRole('button', { name: 'Filter' });
  const rows = page.getByRole('row').filter({ has: page.getByRole('cell') });
  await expect(rows).toHaveCount(13);
  await expect(search.getByRole('combobox')).toHaveCount(0);

  // Aries, Sagittarius and Aquarius hold "ar".
  await search.getByRole('searchbox', { name: 'Name' }).fill('AR');
  await filter.click();
  await expect(page).toHaveURL(/\/admin\/zodiac-signs\?query=AR$/);
  await expect(rows).toHaveCount(3);
  await expect(page.getByRole('link', { name: 'Edit Aries' })).toHaveAttribute(
    'href',
    '/admin/zodiac-signs?query=AR&edit=aries',
  );
  await assertNoAccessibilityViolations(page);

  await search.getByRole('searchbox', { name: 'Name' }).fill('no such sign');
  await filter.click();
  await expect(page.getByText('No sign matches.')).toBeVisible();
});

test('an admin is told which compendium entries list a planet before it can go', async ({
  page,
}) => {
  await signInAs(page, 'held-admin@admin-astrology.test', ['discord'], 'admin');
  // The standard seed's Bay Laurel and Rosemary list the Sun among their planets.
  await page.goto('/admin/planets?edit=sun');
  const editing = page.getByRole('dialog', { name: 'Edit Planet' });
  await expect(editing.getByRole('textbox', { name: 'Name' })).toHaveValue('Sun');

  await editing.getByRole('button', { name: 'Delete Planet' }).click();
  await editing.getByRole('button', { name: 'Delete', exact: true }).click();

  await expect(editing.getByRole('alert')).toContainText(
    /^"Sun" is among the planets of \d+ compendium entries — .+\. Take it off their planets first\.$/,
  );
  await expect(editing).toBeVisible();
  // Still live: its address still opens it.
  await page.goto('/admin/planets?edit=sun');
  await expect(editing).toBeVisible();
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
  await expect(page).toHaveTitle('Category Groups — Admin — Sorrel & Salt');
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
  await expect(dark).toHaveAccessibleDescription(
    /The dark theme colour reads 2\.16:1 on the dark card — it needs at least 4\.5:1/,
  );
  await dark.fill('#4e8bc2');
  await expect(adding.getByText('4.68:1 on the dark card')).toBeVisible();
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
  const editing = page.getByRole('dialog', { name: 'Edit Category Group' });
  await editing.getByRole('button', { name: 'Delete Group' }).click();
  await editing.getByRole('combobox', { name: 'Move its 1 category to' }).click();
  await editing.getByRole('option', { name: 'Cleansing & Release' }).click();
  await editing.getByRole('button', { name: 'Continue' }).click();
  await expect(
    editing.getByText(
      /^Move 1 category to "Cleansing & Release" and delete "Aaa Testwort Wards"\?/,
    ),
  ).toBeVisible();
  await assertNoAccessibilityViolations(page);
  await editing.getByRole('button', { name: 'Move and Delete' }).click();
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
  await expect(page).toHaveTitle('Form Groups — Admin — Sorrel & Salt');
  const adding = page.getByRole('dialog', { name: 'Add Form Group' });
  await expect(adding.getByRole('textbox', { name: 'Dark Theme Colour', exact: true })).toHaveCount(
    0,
  );
  await adding.getByRole('textbox', { name: 'Name' }).fill('Aaa Fixture Matter');
  await adding.getByRole('textbox', { name: 'Description' }).fill('Made by the e2e spec');
  await assertNoAccessibilityViolations(page);
  await adding.getByRole('button', { name: 'Save Group' }).click();
  await expect(adding).toHaveCount(0);

  await page.getByRole('link', { name: 'Edit Aaa Fixture Matter' }).click();
  const editing = page.getByRole('dialog', { name: 'Edit Form Group' });
  await editing.getByRole('textbox', { name: 'Name' }).fill('Aaa Fixture Stuff');
  await editing.getByRole('button', { name: 'Save Group' }).click();
  await expect(editing).toHaveCount(0);
  await expect(page.getByRole('row', { name: /Aaa Fixture Stuff/ })).toBeVisible();

  await page.goto('/admin/form-groups?edit=aaa-fixture-stuff');
  await editing.getByRole('button', { name: 'Delete Group' }).click();
  await expect(
    editing.getByText('Delete "Aaa Fixture Stuff"? No form is filed under it.'),
  ).toBeVisible();
  await editing.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(editing).toHaveCount(0);
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

// MB.132: the curated deity vocabulary in the forms page's shape — each deity
// under its tradition, its address its name and its tradition's.
test('an admin adds, renames and deletes a deity in the modal over the list', async ({ page }) => {
  await signInAs(page, 'an-admin@admin-deities.test', ['discord'], 'admin');

  const response = await page.goto('/admin/deities');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle('Deities — Admin — Sorrel & Salt');
  await expect(page.getByRole('heading', { level: 1, name: 'Deities' })).toBeVisible();
  // The seeded vocabulary pages 25 at a time, by tradition and then name.
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(26);
  await expect(page.getByRole('navigation', { name: 'Pages' })).toContainText(/Page 1 of \d+/);

  await page.getByRole('link', { name: 'Add Deity' }).click();
  const adding = page.getByRole('dialog', { name: 'Add Deity' });
  await expect(page).toHaveURL(/\/admin\/deities\?new$/);
  await expect(adding.getByRole('button', { name: 'Save Deity' })).toBeDisabled();
  await adding.getByRole('textbox', { name: 'Name' }).fill('Aaa Testra');
  await adding.getByRole('textbox', { name: 'Description' }).fill('Made by the e2e spec');
  await adding.getByRole('combobox', { name: 'Tradition' }).click();
  await adding.getByRole('option', { name: 'Greek', exact: true }).click();
  await assertNoAccessibilityViolations(page);
  await adding.getByRole('button', { name: 'Save Deity' }).click();
  await expect(adding).toHaveCount(0);

  // Its address carries its tradition, which the list shows beside it.
  await page.goto('/admin/deities?tradition=greek&query=aaa');
  const row = page.getByRole('row', { name: /Aaa Testra/ });
  await expect(row.getByRole('cell', { name: 'Greek', exact: true })).toBeVisible();
  await row.getByRole('link', { name: 'Edit Aaa Testra' }).click();
  const editing = page.getByRole('dialog', { name: 'Edit Deity' });
  await expect(page).toHaveURL(
    /\/admin\/deities\?query=aaa&tradition=greek&edit=aaa-testra-greek$/,
  );
  // A rename carries onto the compendium, and says so before it is saved.
  const note = editing.getByText('Saving renames it on every compendium entry that picked it.');
  await expect(note).toHaveCount(0);
  await editing.getByRole('textbox', { name: 'Name' }).fill('Aaa Mockra');
  await expect(note).toBeVisible();
  await assertNoAccessibilityViolations(page);
  await editing.getByRole('button', { name: 'Save Deity' }).click();
  await expect(editing).toHaveCount(0);
  const renamed = page.getByRole('row', { name: /Aaa Mockra/ });
  await expect(renamed).toBeVisible();

  await renamed.getByRole('link', { name: 'Edit Aaa Mockra' }).click();
  await expect(page).toHaveURL(/edit=aaa-mockra-greek$/);
  await editing.getByRole('button', { name: 'Delete Deity' }).click();
  await expect(editing.getByText(/^Delete "Aaa Mockra"\?/)).toBeVisible();
  await editing.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(editing).toHaveCount(0);
  await expect(page.getByRole('row', { name: /Aaa / })).toHaveCount(0);
});

test('an admin is told which compendium entries pick a deity before it can go', async ({
  page,
}) => {
  await signInAs(page, 'held-admin@admin-deities.test', ['discord'], 'admin');
  // The standard seed's Bay Laurel picks the curated Apollo, filed under Greek.
  await page.goto('/admin/deities?edit=apollo-greek');
  const editing = page.getByRole('dialog', { name: 'Edit Deity' });
  await expect(editing.getByRole('textbox', { name: 'Name' })).toHaveValue('Apollo');

  await editing.getByRole('button', { name: 'Delete Deity' }).click();
  await editing.getByRole('button', { name: 'Delete', exact: true }).click();

  await expect(editing.getByRole('alert')).toContainText(
    /^"Apollo" is among the deities of \d+ compendium entr(y|ies) — .+\. Take it off (its|their) deities first\.$/,
  );
  await page.goto('/admin/deities?edit=apollo-greek');
  await expect(editing).toBeVisible();
});

// A tradition's rename re-slugs its deities, and its delete moves them to the
// tradition the admin picks, re-slugged there.
test('an admin adds and renames a tradition, then moves its deity before deleting it', async ({
  page,
}) => {
  await signInAs(page, 'tradition-admin@admin-deities.test', ['discord'], 'admin');

  const response = await page.goto('/admin/deity-traditions?new');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle('Deity Traditions — Admin — Sorrel & Salt');
  const adding = page.getByRole('dialog', { name: 'Add Tradition' });
  await adding.getByRole('textbox', { name: 'Name' }).fill('Aaa Fixtural');
  await adding.getByRole('textbox', { name: 'Description' }).fill('Made by the e2e spec');
  await assertNoAccessibilityViolations(page);
  await adding.getByRole('button', { name: 'Save Tradition' }).click();
  await expect(adding).toHaveCount(0);

  await page.goto('/admin/deities?new');
  const deity = page.getByRole('dialog', { name: 'Add Deity' });
  await deity.getByRole('textbox', { name: 'Name' }).fill('Aaa Testra');
  await deity.getByRole('textbox', { name: 'Description' }).fill('Filed under the tradition');
  await deity.getByRole('combobox', { name: 'Tradition' }).click();
  await deity.getByRole('option', { name: 'Aaa Fixtural', exact: true }).click();
  await deity.getByRole('button', { name: 'Save Deity' }).click();
  await expect(deity).toHaveCount(0);

  await page.goto('/admin/deity-traditions?edit=aaa-fixtural');
  const editing = page.getByRole('dialog', { name: 'Edit Tradition' });
  await editing.getByRole('textbox', { name: 'Name' }).fill('Aaa Mockish');
  await editing.getByRole('button', { name: 'Save Tradition' }).click();
  await expect(editing).toHaveCount(0);
  // The deity's address followed its tradition's name.
  await page.goto('/admin/deities?edit=aaa-testra-aaa-mockish');
  await expect(
    page.getByRole('dialog', { name: 'Edit Deity' }).getByRole('textbox', { name: 'Name' }),
  ).toHaveValue('Aaa Testra');

  await page.goto('/admin/deity-traditions?edit=aaa-mockish');
  await editing.getByRole('button', { name: 'Delete Tradition' }).click();
  await editing.getByRole('combobox', { name: 'Move its 1 deity to' }).click();
  await editing.getByRole('option', { name: 'Greek', exact: true }).click();
  await editing.getByRole('button', { name: 'Continue' }).click();
  await editing.getByRole('button', { name: 'Move and Delete' }).click();
  await expect(editing).toHaveCount(0);
  await expect(page.getByRole('row', { name: /Aaa Mockish/ })).toHaveCount(0);

  await page.goto('/admin/deities?edit=aaa-testra-greek');
  const moved = page.getByRole('dialog', { name: 'Edit Deity' });
  await expect(moved.getByRole('combobox', { name: 'Tradition' })).toHaveText(/Greek/);
  await moved.getByRole('button', { name: 'Delete Deity' }).click();
  await moved.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(moved).toHaveCount(0);
});
