import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import postgres from 'postgres';
import { e2eDatabaseUrl, recreateE2eDatabase } from './database';
import { signInAs } from './session';
import { slugify } from '@/lib/slugify';

// The admin pages against the built server, for what no story walks: the
// layout, the user list and its approval, the curator role (M11.20), and the
// zodiac filter. A non-admin's
// 403 on every admin route, each curated page's add, edit and delete, and the
// user modal are the story suite's (tests/e2e/stories/07-admin.spec.ts,
// stories 17–19); admin grants and the pause are story 60's
// (08-email-and-admin.spec.ts). A signed-out visitor's redirect is
// route-protection.spec.ts's.
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

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

test('an admin sees the admin layout and its nav', async ({ page }) => {
  // A desktop window: a phone folds the later tabs behind More (shell.spec.ts),
  // and this test counts every link.
  await page.setViewportSize({ width: 1280, height: 800 });
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

test('an admin lists the users at /admin/users, filtered, with their sign-in methods', async ({
  page,
}) => {
  // The one account here not yet approved, which the Needs Approval filter
  // narrows the list to.
  await signInAs(page, 'not-an-admin@admin-users.test');
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
  // An optional reason, as Promote and Revoke of admin take one.
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

// M11.20: the curator role, given and taken back through the one Change Role
// dialog, each change in the ledger. A curator holds the creation flag from
// the same write, and keeps it when the role is taken away, as an admin does.
test('an admin makes a user a curator from the user screen, then takes the role back', async ({
  page,
}) => {
  const { userId } = await signInAs(page, 'becoming@admin-curator.test');
  await signInAs(page, 'an-admin@admin-curator.test', ['discord'], 'admin');

  const response = await page.goto('/admin/users?query=becoming%40admin-curator.test');
  expect(response?.status()).toBe(200);
  const row = page.getByRole('row', { name: /becoming@admin-curator\.test/ });
  await expect(row.getByRole('cell').nth(2)).toHaveText(/^User/);
  await expect(row.getByRole('cell').nth(3)).toHaveText(/^No/);

  await row.getByRole('button', { name: 'Change Role for Fixture Person' }).click();
  const granting = page.getByRole('dialog', { name: 'Change Role' });
  await expect(granting).toContainText('Fixture Person');
  await granting.getByRole('radio', { name: /^Curator\b/ }).check();
  await granting.getByRole('textbox', { name: 'Reason' }).fill('Keeps the herbals');
  await assertNoAccessibilityViolations(page);
  await granting.getByRole('button', { name: 'Promote' }).click();
  await expect(granting).toHaveCount(0);

  // A curator, who may create a coven: the creation cell holds the mark alone.
  await expect(row.getByRole('cell').nth(2)).toHaveText(/^Curator/);
  await expect(row.getByRole('cell').nth(3)).toHaveText('Yes');
  expect(await privilegeChanges(userId)).toEqual([
    { privilege: 'create_workspace', change: 'grant', via: 'admin', note: 'Keeps the herbals' },
    { privilege: 'curator', change: 'grant', via: 'admin', note: 'Keeps the herbals' },
  ]);

  // Taken back to a user, the flag staying.
  await row.getByRole('button', { name: 'Change Role for Fixture Person' }).click();
  const demoting = page.getByRole('dialog', { name: 'Change Role' });
  await demoting.getByRole('radio', { name: /^User\b/ }).check();
  await demoting.getByRole('button', { name: 'Demote' }).click();
  await expect(demoting).toHaveCount(0);

  await expect(row.getByRole('cell').nth(2)).toHaveText(/^User/);
  await expect(row.getByRole('cell').nth(3)).toHaveText(/^Yes/);
  expect((await privilegeChanges(userId)).slice(2)).toEqual([
    { privilege: 'curator', change: 'revoke', via: 'admin', note: null },
  ]);
});

// M11.20: a curator reaches every curation page and nothing on People. The
// navigation leaving People out is only what they see; each People page
// refuses them itself, and a coven they hold no seat in is a 404 as for
// anyone else.
test('a curator reaches /admin and the curation pages, and is refused People and a coven', async ({
  page,
}) => {
  // A desktop window, as the admin's nav test, since this one counts every link.
  await page.setViewportSize({ width: 1280, height: 800 });
  await signInAs(page, 'a-curator@admin-curator.test', ['discord'], 'curator');

  const response = await page.goto('/admin');
  expect(response?.status()).toBe(200);
  const nav = page.getByRole('navigation', { name: 'Admin' });
  const pages = [
    ['Compendium', '/admin/compendium'],
    ['Categories', '/admin/categories'],
    ['Forms', '/admin/forms'],
    ['Deities', '/admin/deities'],
    ['Astrology', '/admin/celestial-bodies'],
  ];
  await expect(nav.getByRole('link')).toHaveCount(pages.length);
  for (const [name, href] of pages) {
    await expect(nav.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
  }
  await expect(page.getByRole('main').getByRole('link', { name: 'People' })).toHaveCount(0);
  await assertNoAccessibilityViolations(page);

  for (const path of [
    '/admin/compendium',
    '/admin/categories',
    '/admin/category-groups',
    '/admin/forms',
    '/admin/form-groups',
    '/admin/deities',
    '/admin/deity-traditions',
    '/admin/celestial-bodies',
    '/admin/zodiac-signs',
  ]) {
    expect((await page.goto(path))?.status(), path).toBe(200);
  }

  for (const path of ['/admin/users', '/admin/privilege-changes', '/admin/invitations']) {
    expect((await page.goto(path))?.status(), path).toBe(403);
  }

  // The standard seed's coven W, which this curator holds no seat in.
  expect((await page.goto(`/coven/${slugify('Whitethorn Coven')}`))?.status()).toBe(404);
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
