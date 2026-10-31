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

test('an admin sees the admin layout and its nav', async ({ page }) => {
  // A desktop window: a phone folds the later tabs behind More (shell.spec.ts),
  // and this test counts every link.
  await page.setViewportSize({ width: 1280, height: 800 });
  await signInAs(page, 'an-admin@admin-guard.test', ['discord'], 'admin');

  const response = await page.goto('/admin');

  expect(response?.status()).toBe(200);
  // One link per page, each at its first tab: a group list is a tab of the
  // list it organises, and Astrology holds the celestial bodies and zodiac signs.
  const nav = page.getByRole('navigation', { name: 'Admin' });
  const pages = [
    ['Compendium', '/admin/compendium'],
    ['Categories', '/admin/categories'],
    ['Forms', '/admin/forms'],
    ['Deities', '/admin/deities'],
    ['Astrology', '/admin/celestial-bodies'],
    ['Support', '/admin/support'],
    ['People', '/admin/users'],
  ];
  await expect(nav.getByRole('link')).toHaveCount(pages.length);
  for (const [name, href] of pages) {
    await expect(nav.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
  }

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
  // A filter's switch takes Space as a checkbox does, which only a browser's keyboard handling shows,
  // and applies the moment it changes: the address gains the flag, the list narrows to the one user not
  // yet approved, and the switch, drawn afresh, has the focus back, so a second Space widens the list.
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
    // says so, so the cell offers no control.
    'Yes',
    /Discord.*Google/,
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
    .nth(4)
    .locator('.user-list__hint:has(.provider-mark--discord)');
  await discord.hover();
  await expect(discord.locator('.user-list__tip')).toBeVisible();
  await assertNoAccessibilityViolations(page);
});

// A curator reaches every curation page and nothing on People. The navigation leaving People out is only
// what they see; each People page refuses them itself, and a coven they hold no seat in is a 404.
test('a curator reaches /admin and the curation pages, and is refused People and a coven', async ({
  page,
}) => {
  await signInAs(page, 'a-curator@admin-curator.test', ['discord'], 'curator');

  // The nav's links for a curator are AdminNav's component test's.
  const response = await page.goto('/admin');
  expect(response?.status()).toBe(200);
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
    '/admin/support',
  ]) {
    expect((await page.goto(path))?.status(), path).toBe(200);
  }

  for (const path of [
    '/admin/users',
    '/admin/privilege-changes',
    '/admin/invitations',
    '/admin/invitation-cards',
    '/admin/card-sign-ups',
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

  for (const path of ['/admin/compendium', '/admin/forms']) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.getByRole('main').getByRole('table').first(), path).toBeVisible();
    // In the page's main: Next puts its route announcer, an empty alert, in <body>.
    await expect(page.getByRole('main').getByRole('alert'), path).toHaveCount(0);
    await expect(page.getByRole('main').getByText(name).first(), path).toBeVisible();
  }
});
