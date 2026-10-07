import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';

// The `/admin` guard against the built server (M5.4; claude-docs/auth/admin-guard.md, "The
// admin guard"): a signed-out visitor is sent to sign in, a signed-in
// non-admin is refused with a 403 page, and an admin sees the layout.
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

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
  await expect(main.getByRole('heading', { level: 1, name: 'Not authorized' })).toBeVisible();
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
    ['Forms', '/admin/forms'],
    ['Planets', '/admin/planets'],
    ['Zodiac signs', '/admin/zodiac-signs'],
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
  await expect(page.getByRole('heading', { level: 1, name: 'Not authorized' })).toBeVisible();
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
  await expect(page.getByRole('search').getByLabel('Name or email')).toHaveValue(
    'admin-users.test',
  );

  // The filter's two matches, and nothing from admin-guard.test's earlier sign-ins.
  const rows = page.getByRole('row').filter({ has: page.getByRole('cell') });
  await expect(rows).toHaveCount(2);
  // Anchored on the name before it: not-an-admin's address ends the same way.
  const admin = page.getByRole('row', { name: /Fixture Person an-admin@admin-users\.test/ });
  await expect(admin.getByRole('cell')).toHaveText([
    'Fixture Person',
    'an-admin@admin-users.test',
    'Admin',
    // Every admin may create a workspace, and the users CHECK says so (MB.177).
    'Yes',
    /^\d{4}-\d{2}-\d{2}$/,
    'Discord, Google',
    'Yes',
  ]);
  await assertNoAccessibilityViolations(page);
});

test('a signed-in non-admin is refused at /admin/categories with the 403 page', async ({
  page,
}) => {
  await signInAs(page, 'not-an-admin@admin-categories.test');

  const response = await page.goto('/admin/categories?new');

  expect(response?.status()).toBe(403);
  await expect(page.getByRole('heading', { level: 1, name: 'Not authorized' })).toBeVisible();
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
