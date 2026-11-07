import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import postgres from 'postgres';
import { e2eDatabaseUrl, recreateE2eDatabase } from './database';
import { signInAs } from './session';
import { asTouch } from '../support/db/touch-row';
import { slugify } from '@/lib/slugify';

// For what the story suite (stories/07-admin.spec.ts, 08-email-and-admin.spec.ts) does not walk. A signed-out redirect is route-protection.spec.ts's.
test.beforeAll(async () => {
  await recreateE2eDatabase();
});

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
  await expect(page.getByRole('navigation', { name: 'Keepers' })).toHaveCount(0);
  await assertNoAccessibilityViolations(page);

  const keepers = await page.goto('/keepers');
  expect(keepers?.status()).toBe(200);
  const keepersNav = page.getByRole('navigation', { name: 'Keepers' });
  const pages = [
    ['Support', '/keepers/support'],
    ['People', '/keepers/users'],
    ['Invitations', '/keepers/invitations'],
    ['Documents', '/keepers/documents/terms'],
    ['Business Cards', '/keepers/business-cards'],
  ];
  await expect(keepersNav.getByRole('link')).toHaveCount(pages.length);
  for (const [name, href] of pages) {
    await expect(
      keepersNav.getByRole('link', { name: new RegExp(`^${name}( \\d+)?$`) }),
    ).toHaveAttribute('href', href);
  }
  await expect(page.getByRole('navigation', { name: 'Curator' })).toHaveCount(0);
  await assertNoAccessibilityViolations(page);
});

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
  await signInAs(page, 'not-an-admin@admin-users.test');
  await signInAs(page, 'an-admin@admin-users.test', ['discord', 'google'], 'admin');

  const response = await page.goto('/keepers/users?query=admin-users.test');

  expect(response?.status()).toBe(200);
  const tab = page.getByRole('navigation', { name: 'People' }).getByRole('link', { name: 'Users' });
  await expect(tab).toHaveAttribute('href', '/keepers/users');
  await expect(tab).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('search').getByLabel('Name or Email')).toHaveValue(
    'admin-users.test',
  );
  // A filter's switch takes Space as a checkbox does, which only a browser's keyboard handling shows; drawn afresh, it has the focus back.
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

  await expect(rows).toHaveCount(2);
  // Anchored on the name and the verified mark's word before it:
  // not-an-admin's address ends the same way.
  const admin = page.getByRole('row', {
    name: /Fixture Person Verified an-admin@admin-users\.test/,
  });
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
    /^Version \d+\.\d+\.\d+$/,
    /\d/,
  ]);
  const email = admin.getByRole('cell').nth(1);
  const tip = email.locator('.user-list__tip');
  await expect(tip).toBeHidden();
  await email.locator('.user-list__mark').hover();
  await expect(tip).toBeVisible();
  const discord = admin
    .getByRole('cell')
    .nth(6)
    .locator('.user-list__hint:has(.provider-mark--discord)');
  await discord.hover();
  await expect(discord.locator('.user-list__tip')).toBeVisible();
  await assertNoAccessibilityViolations(page);
});

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

// Under Keepers a curator sees Support alone, but the nav leaving the rest out is only what they see: each People, Invitations and Documents tab refuses them itself.
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
    '/keepers/business-cards',
  ]) {
    expect((await page.goto(path))?.status(), path).toBe(403);
  }

  expect((await page.goto(`/coven/${slugify('Whitethorn Coven')}`))?.status()).toBe(404);
});
test('an admin filters the zodiac signs by part of a name', async ({ page }) => {
  await signInAs(page, 'filter-admin@admin-astrology.test', ['discord'], 'admin');
  const response = await page.goto('/curator/zodiac-signs');
  expect(response?.status()).toBe(200);
  const search = page.getByRole('search');
  const searchButton = search.getByRole('button', { name: 'Search' });
  const rows = page.getByRole('row').filter({ has: page.getByRole('cell') });
  await expect(rows).toHaveCount(13);
  await expect(search.getByRole('combobox')).toHaveCount(0);

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
