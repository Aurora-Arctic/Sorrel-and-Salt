import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import postgres from 'postgres';
import { e2eDatabaseUrl, recreateE2eDatabase } from './database';
import { signInAs } from './session';
import { asTouch } from '../support/db/touch-row';
import { slugify } from '@/lib/slugify';

// The admin pages against the built server, for what the story suite (stories/07-admin.spec.ts,
// 08-email-and-admin.spec.ts) does not walk: layout, the user list and its filters, a curator's refusals,
// the zodiac filter and the edit stamps. A signed-out redirect is route-protection.spec.ts's.
test.beforeAll(async () => {
  await recreateE2eDatabase();
});

// The curation pages, each at its first tab: a group list is a tab of the list it organises,
// and Astrology holds the celestial bodies and zodiac signs.
const CURATION = [
  ['Compendium', '/curator/compendium'],
  ['Categories', '/curator/categories'],
  ['Forms', '/curator/forms'],
  ['Deities', '/curator/deities'],
  ['Astrology', '/curator/celestial-bodies'],
];

test('an admin sees the curator area and its nav at /curator, and the keepers area and its nav at /keepers', async ({
  page,
}) => {
  // A desktop window: a phone folds the later tabs behind More (shell.spec.ts),
  // and this test counts every link.
  await page.setViewportSize({ width: 1280, height: 800 });
  await signInAs(page, 'an-admin@admin-guard.test', ['discord'], 'admin');

  const curator = await page.goto('/curator');
  expect(curator?.status()).toBe(200);
  const curatorNav = page.getByRole('navigation', { name: 'Curator' });
  await expect(curatorNav.getByRole('link')).toHaveCount(CURATION.length);
  for (const [name, href] of CURATION) {
    await expect(curatorNav.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
  }
  // Each area draws its own nav and not the other's.
  await expect(page.getByRole('navigation', { name: 'Keepers' })).toHaveCount(0);
  await assertNoAccessibilityViolations(page);

  const keepers = await page.goto('/keepers');
  expect(keepers?.status()).toBe(200);
  const keepersNav = page.getByRole('navigation', { name: 'Keepers' });
  const pages = [
    ['Support', '/keepers/support'],
    ['People', '/keepers/users'],
    ['Invitations', '/keepers/invitations'],
    // The documents open on the privacy policy, their first tab.
    ['Documents', '/keepers/documents/privacy'],
  ];
  await expect(keepersNav.getByRole('link')).toHaveCount(pages.length);
  // A tab with a count is named "Support 0": its label, then its count.
  for (const [name, href] of pages) {
    await expect(
      keepersNav.getByRole('link', { name: new RegExp(`^${name}( \\d+)?$`) }),
    ).toHaveAttribute('href', href);
  }
  await expect(page.getByRole('navigation', { name: 'Curator' })).toHaveCount(0);
  await assertNoAccessibilityViolations(page);
});

// The pages moved, and nothing redirects from where they were: each old address is a 404 where it was asked for.
test('the old /admin addresses answer 404 to an admin', async ({ page }) => {
  await signInAs(page, 'old-addresses@admin-guard.test', ['discord'], 'admin');

  // Why each could have answered: the same keeper opens every page at its new address. These are also
  // the People and Invitations tabs a curator is refused below, open to a keeper.
  for (const path of [
    '/curator/compendium',
    '/keepers/support',
    '/keepers/users',
    '/keepers/privilege-changes',
    '/keepers/invitations',
    '/keepers/invitation-cards',
    '/keepers/card-sign-ups',
  ]) {
    expect((await page.goto(path))?.status(), path).toBe(200);
  }

  for (const path of [
    '/admin',
    '/admin/compendium',
    '/admin/categories',
    '/admin/category-groups',
    '/admin/forms',
    '/admin/form-groups',
    '/admin/deities',
    '/admin/deity-traditions',
    '/admin/celestial-bodies',
    '/admin/zodiac-signs',
    '/admin/support',
    '/admin/users',
    '/admin/privilege-changes',
    '/admin/invitations',
    '/admin/invitation-cards',
    '/admin/card-sign-ups',
  ]) {
    expect((await page.goto(path))?.status(), path).toBe(404);
    expect(new URL(page.url()).pathname, path).toBe(path);
  }
});

test('an admin lists the users at /keepers/users, filtered, with their sign-in methods', async ({
  page,
}) => {
  // The one account here not yet approved, which the Needs Approval filter
  // narrows the list to.
  await signInAs(page, 'not-an-admin@admin-users.test');
  await signInAs(page, 'an-admin@admin-users.test', ['discord', 'google'], 'admin');

  const response = await page.goto('/keepers/users?query=admin-users.test');

  expect(response?.status()).toBe(200);
  // Users is the People page's first tab, and the one open here.
  const tab = page.getByRole('navigation', { name: 'People' }).getByRole('link', { name: 'Users' });
  await expect(tab).toHaveAttribute('href', '/keepers/users');
  await expect(tab).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('search').getByLabel('Name or Email')).toHaveValue(
    'admin-users.test',
  );
  // A filter's switch takes Space as a checkbox does, which only a browser's keyboard handling shows,
  // and applies the moment it changes: the address gains the flag, the list narrows to the one user not
  // yet approved, and the switch, drawn afresh, has the focus back, so a second Space widens the list.
  const awaiting = page.getByRole('search').getByRole('switch', { name: 'Needs Approval' });
  const rows = page.getByRole('row').filter({ has: page.getByRole('cell') });
  await awaiting.focus();
  await page.keyboard.press('Space');
  await expect(page).toHaveURL(/\/keepers\/users\?query=admin-users\.test&awaiting$/);
  await expect(awaiting).toBeChecked();
  await expect(rows).toHaveCount(1);
  await expect(awaiting).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page).toHaveURL(/\/keepers\/users\?query=admin-users\.test$/);
  await expect(awaiting).not.toBeChecked();

  // The filter's two matches, and nothing from admin-guard.test's earlier sign-ins.
  await expect(rows).toHaveCount(2);
  // Anchored on the name and the verified mark's word before it:
  // not-an-admin's address ends the same way.
  const admin = page.getByRole('row', {
    name: /Fixture Person Verified an-admin@admin-users\.test/,
  });
  // The name, the address, the role, the creation flag, no standing time-out or pause, both sign-in
  // methods, the terms version signing in agreed to, and the joining date: the account's state as the
  // row carries it.
  await expect(admin.getByRole('cell')).toHaveText([
    /Fixture Person$/,
    /an-admin@admin-users\.test$/,
    /^Keeper/,
    // A mark alone: every keeper may create a workspace, and the users CHECK
    // says so, so the cell offers no control.
    'Yes',
    'Not timed out',
    'Not paused',
    /Discord.*Google/,
    /^Version \d+$/,
    /\d/,
  ]);
  // The mark's tip bubble shows on hover, a real browser's CSS.
  const email = admin.getByRole('cell').nth(1);
  const tip = email.locator('.user-list__tip');
  await expect(tip).toBeHidden();
  await email.locator('.user-list__mark').hover();
  await expect(tip).toBeVisible();
  // So does each sign-in logo's.
  const discord = admin
    .getByRole('cell')
    .nth(6)
    .locator('.user-list__hint:has(.provider-mark--discord)');
  await discord.hover();
  await expect(discord.locator('.user-list__tip')).toBeVisible();
  await assertNoAccessibilityViolations(page);
});

// The Support Timed Out and Access Paused switches narrow the list in SQL to the users a time-out or a pause stands on.
test('an admin narrows the users to those timed out of support, and to those whose access is paused', async ({
  page,
}) => {
  const timed = await signInAs(page, 'timed-out@admin-filters.test');
  const paused = await signInAs(page, 'paused@admin-filters.test');
  await signInAs(page, 'neither@admin-filters.test');
  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    await sql`
      insert into support_timeouts (user_id, until, note, created_by, updated_by)
      values (${timed.userId}, now() + interval '2 days', 'Testnote', ${timed.userId}, ${timed.userId})
    `;
    await sql`
      insert into user_access_pauses (user_id, note, created_by, updated_by)
      values (${paused.userId}, 'Testnote', ${paused.userId}, ${paused.userId})
    `;
  } finally {
    await sql.end();
  }
  await signInAs(page, 'an-admin@admin-filters.test', ['discord'], 'admin');

  await page.goto('/keepers/users?query=admin-filters.test');
  const filter = page.getByRole('search');
  const rows = page.getByRole('row').filter({ has: page.getByRole('cell') });
  // The three users and the admin, before either switch narrows them.
  await expect(rows).toHaveCount(4);

  const timedOut = filter.getByRole('switch', { name: 'Support Timed Out' });
  await timedOut.click();
  await expect(page).toHaveURL(/\/keepers\/users\?query=admin-filters\.test&timed-out$/);
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('timed-out@admin-filters.test');
  await timedOut.click();
  await expect(page).toHaveURL(/\/keepers\/users\?query=admin-filters\.test$/);
  await expect(rows).toHaveCount(4);

  const accessPaused = filter.getByRole('switch', { name: 'Access Paused' });
  await accessPaused.click();
  await expect(page).toHaveURL(/\/keepers\/users\?query=admin-filters\.test&paused$/);
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('paused@admin-filters.test');
  await assertNoAccessibilityViolations(page);
});

// A curator reaches every curation page and, under Keepers, Support alone. The Keepers nav leaving the rest out
// is only what they see; each People, Invitations and Documents tab refuses them itself, and a coven they hold no seat in is a 404.
test('a curator reaches /curator, the curation pages and /keepers with Support alone, and is refused People, Invitations, the documents and a coven', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await signInAs(page, 'a-curator@admin-curator.test', ['discord'], 'curator');

  const curator = await page.goto('/curator');
  expect(curator?.status()).toBe(200);
  const curatorNav = page.getByRole('navigation', { name: 'Curator' });
  await expect(curatorNav.getByRole('link')).toHaveCount(CURATION.length);
  await assertNoAccessibilityViolations(page);

  const keepers = await page.goto('/keepers');
  expect(keepers?.status()).toBe(200);
  const keepersNav = page.getByRole('navigation', { name: 'Keepers' });
  await expect(keepersNav.getByRole('link')).toHaveCount(1);
  await expect(keepersNav.getByRole('link', { name: /^Support( \d+)?$/ })).toHaveAttribute(
    'href',
    '/keepers/support',
  );
  await expect(page.getByRole('main').getByRole('link', { name: 'People' })).toHaveCount(0);
  await expect(page.getByRole('main').getByRole('link', { name: 'Invitations' })).toHaveCount(0);
  await assertNoAccessibilityViolations(page);

  for (const path of [
    '/curator/compendium',
    '/curator/categories',
    '/curator/category-groups',
    '/curator/forms',
    '/curator/form-groups',
    '/curator/deities',
    '/curator/deity-traditions',
    '/curator/celestial-bodies',
    '/curator/zodiac-signs',
    '/keepers/support',
  ]) {
    expect((await page.goto(path))?.status(), path).toBe(200);
  }

  for (const path of [
    '/keepers/users',
    '/keepers/privilege-changes',
    '/keepers/invitations',
    '/keepers/invitation-cards',
    '/keepers/card-sign-ups',
    '/keepers/documents/privacy',
    '/keepers/documents/disclaimer',
  ]) {
    expect((await page.goto(path))?.status(), path).toBe(403);
  }

  // The standard seed's coven W, which this curator holds no seat in.
  expect((await page.goto(`/coven/${slugify('Whitethorn Coven')}`))?.status()).toBe(404);
});
// The zodiac page's one flow, since the celestial bodies' CRUD covers the shared
// modal: its list read through the address a filter makes.
test('an admin filters the zodiac signs by part of a name', async ({ page }) => {
  await signInAs(page, 'filter-admin@admin-astrology.test', ['discord'], 'admin');
  const response = await page.goto('/curator/zodiac-signs');
  expect(response?.status()).toBe(200);
  const search = page.getByRole('search');
  const searchButton = search.getByRole('button', { name: 'Search' });
  const rows = page.getByRole('row').filter({ has: page.getByRole('cell') });
  await expect(rows).toHaveCount(13);
  await expect(search.getByRole('combobox')).toHaveCount(0);

  // Aries, Sagittarius and Aquarius hold "ar".
  await search.getByRole('searchbox', { name: 'Name' }).fill('AR');
  await searchButton.click();
  await expect(page).toHaveURL(/\/curator\/zodiac-signs\?query=AR$/);
  await expect(rows).toHaveCount(3);
  await expect(page.getByRole('link', { name: 'Edit Aries' })).toHaveAttribute(
    'href',
    '/curator/zodiac-signs?query=AR&edit=aries',
  );
  await assertNoAccessibilityViolations(page);

  await search.getByRole('searchbox', { name: 'Name' }).fill('no such sign');
  await searchButton.click();
  // The address first: while the list is on its way its skeleton stands in,
  // which has no table either, so the count alone would pass at once.
  await expect(page).toHaveURL(/\/curator\/zodiac-signs\?query=no\+such\+sign$/);
  await expect(page.getByRole('table')).toHaveCount(0);
});

// Regression: a curator opening a curated list got a 500, as the Updated column read its editors' names
// through a site admin's read. A list with no rows never reached that read, so the rows here are stamped
// with the curator as their last editor first.
test('a curator opens the compendium and a vocabulary list with edited rows and sees their stamps', async ({
  page,
}) => {
  const { userId } = await signInAs(
    page,
    'list-curator@admin-curator.test',
    ['discord'],
    'curator',
  );

  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  let name: string;
  try {
    [{ name }] = await sql`select name from users where id = ${userId}`;
    // Stamps alone: the trigger keeps them unless the write declares itself a touch.
    let entries = 0;
    let forms = 0;
    await asTouch(sql, async (tx) => {
      entries = (
        await tx`
        update ingredients set updated_by = ${userId} where workspace_id is null and deleted_at is null returning id`
      ).length;
      forms = (
        await tx`
        update ingredient_forms set updated_by = ${userId} where deleted_at is null returning id`
      ).length;
    });
    // Without rows the pages name no editor, so the case would prove nothing.
    expect(entries).toBeGreaterThan(0);
    expect(forms).toBeGreaterThan(0);
  } finally {
    await sql.end();
  }

  for (const path of ['/curator/compendium', '/curator/forms']) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.getByRole('main').getByRole('table').first(), path).toBeVisible();
    // In the page's main: Next puts its route announcer, an empty alert, in <body>.
    await expect(page.getByRole('main').getByRole('alert'), path).toHaveCount(0);
    await expect(page.getByRole('main').getByText(name).first(), path).toBeVisible();
  }
});
