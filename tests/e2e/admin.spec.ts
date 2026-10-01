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
