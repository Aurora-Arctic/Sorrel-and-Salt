import type { Page } from '@playwright/test';
import postgres from 'postgres';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll, settleTransitions } from './axe';
import { e2eDatabaseUrl, recreateE2eDatabase } from './database';
import { signInAgainAs, signInAs } from './session';
import { slotUrl } from './slots';

// The application shell against the built server (MB.7): the bar, the context
// row and the section navs that frame every signed-in page, at a desktop and
// at a phone's width. What a component test cannot prove is here: where the
// browser lays the bottom bar, which element takes the focus after a key, and
// the scans over the whole frame. The switcher's entry to the create page
// (Story 3) is walked here once; coven-create.spec.ts walks the form. Each
// worker builds the fixture rows in its own database before its first test,
// so the tests are independent and spread across workers.

const ALPHA = { name: 'Shell Alpha', slug: 'shell-alpha' };
const BETA = { name: 'Shell Beta', slug: 'shell-beta' };
const PHONE = { width: 375, height: 812 };
const DESKTOP = { width: 1280, height: 800 };

const users = {
  member: { id: '' }, // a member of Alpha alone
  multi: { id: '' }, // a member of both, holding the right to create
  admin: { id: '' },
  plain: { id: '' }, // signed in, in no coven, no admin
};

test.beforeAll(async ({ browser, slot }) => {
  await recreateE2eDatabase();

  // `signInAs` wants a page; only its rows matter here, so the page, and the
  // session it holds, is thrown away. Each test signs in again for itself.
  const setup = await browser.newPage({ baseURL: slotUrl(slot) });
  try {
    await seedFixtures(setup);
  } finally {
    await setup.close();
  }
});

async function seedFixtures(page: Page): Promise<void> {
  for (const key of Object.keys(users) as (keyof typeof users)[]) {
    users[key] = {
      id: (
        await signInAs(page, `${key}@shell.test`, ['discord'], key === 'admin' ? 'admin' : 'user')
      ).userId,
    };
  }

  const sql = postgres(e2eDatabaseUrl(), { onnotice: () => {} });
  try {
    await sql.begin(async (tx) => {
      await tx`select set_config('app.privilege_route', 'manual', true)`;
      await tx`update users set can_create_workspace = true where id = ${users.multi.id}`;
    });
    const owner = users.multi.id;
    for (const coven of [ALPHA, BETA]) {
      const [row] = await sql`
        insert into workspaces (name, slug, created_by, updated_by)
        values (${coven.name}, ${coven.slug}, ${owner}, ${owner})
        returning id`;
      const members =
        coven === ALPHA
          ? [
              [owner, 'owner'],
              [users.member.id, 'member'],
            ]
          : [[owner, 'owner']];
      for (const [userId, role] of members) {
        await sql`
          insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
          values (${row.id}, ${userId}, ${role}, ${owner}, ${owner})`;
      }
    }
    const rows = await sql`
      select count(*)::int as n from workspace_members m
      join workspaces w on w.id = m.workspace_id
      where m.deleted_at is null and w.slug in ${sql([ALPHA.slug, BETA.slug])}`;
    expect(rows[0].n).toBe(3);
  } finally {
    await sql.end();
  }
}

/** The theme button, in the bar at every width (M10.32). */
async function toggleTheme(page: Page): Promise<void> {
  const toggle = page.getByRole('button', { name: 'Toggle light and dark mode' });
  const before = await toggle.getAttribute('aria-pressed');
  await toggle.click();
  await expect(toggle).not.toHaveAttribute('aria-pressed', before!);
  await settleTransitions(page);
}

test('a member on the coven page sees the bar, the coven nav and the account panel', async ({
  page,
}) => {
  await signInAgainAs(page, users.member.id);
  await page.setViewportSize(DESKTOP);
  await page.goto(`/coven/${ALPHA.slug}`);

  const banner = page.getByRole('banner');
  await expect(banner).toBeVisible();
  // The brand leads straight into the member's coven (shellHome), never via the
  // /coven landing's redirect (MB.257).
  await expect(banner.getByRole('link', { name: 'Sorrel & Salt' })).toHaveAttribute(
    'href',
    `/coven/${ALPHA.slug}`,
  );
  // A non-admin has no site links yet, so the Site nav is not drawn at all.
  await expect(page.getByRole('navigation', { name: 'Site' })).toHaveCount(0);
  await expect(banner.getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0);
  await expect(banner.getByRole('link', { name: 'Your Coven', exact: true })).toHaveCount(0);

  const coven = page.getByRole('navigation', { name: 'Coven' });
  await expect(coven.getByRole('link', { name: 'Overview', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.getByRole('combobox', { name: 'Coven' })).toHaveText(ALPHA.name);
  await expect(banner.getByRole('button', { name: 'Add Ingredient', exact: true })).toBeDisabled();

  const account = banner.getByRole('button', { name: 'Fixture Person' });
  await expect(account).toHaveAttribute('aria-expanded', 'false');
  await account.click();
  await expect(account).toHaveAttribute('aria-expanded', 'true');
  await expect(banner.getByRole('link', { name: 'Your Account', exact: true })).toHaveAttribute(
    'href',
    '/account',
  );
  // Sign Out, refused: the refusal is routed rather than awaited from Better
  // Auth, as tests/e2e/account.spec.ts once did beside the page's heading,
  // since whether it refuses depends on the origin the browser reaches the
  // server on. The panel stays open and says so beside the button.
  await page.route('**/api/auth/sign-out', (route) =>
    route.fulfill({ status: 403, json: { code: 'INVALID_ORIGIN', message: 'Invalid origin' } }),
  );
  const signOut = banner.getByRole('button', { name: 'Sign Out', exact: true });
  await expect(signOut).toBeEnabled();
  await signOut.click();
  await expect(banner.getByRole('alert')).toBeVisible();
  await expect(signOut).toBeEnabled();
  await settleTransitions(page);
  await assertNoAccessibilityViolations(page);
  await page.unroute('**/api/auth/sign-out');

  await page.keyboard.press('Escape');
  await expect(account).toHaveAttribute('aria-expanded', 'false');
  await expect(banner.getByRole('link', { name: 'Your Account' })).toHaveCount(0);
  await expect(account).toBeFocused();
});

test('the account page is in the shell, with no coven nav and no switcher', async ({ page }) => {
  await signInAgainAs(page, users.member.id);
  await page.setViewportSize(DESKTOP);
  await page.goto('/account');

  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Site' })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Coven' })).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Coven' })).toHaveCount(0);
});

test('an admin sees both site links, the admin nav and no switcher', async ({ page }) => {
  await signInAgainAs(page, users.admin.id);
  await page.setViewportSize(DESKTOP);
  await page.goto('/admin/categories');

  const banner = page.getByRole('banner');
  await expect(banner.getByRole('link', { name: 'Sorrel & Salt' })).toHaveAttribute(
    'href',
    '/admin',
  );
  const site = page.getByRole('navigation', { name: 'Site' });
  await expect(site.getByRole('link', { name: 'Your Coven', exact: true })).toBeVisible();
  await expect(site.getByRole('link', { name: 'Admin', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );

  const admin = page.getByRole('navigation', { name: 'Admin' });
  await expect(admin.getByRole('link')).toHaveCount(6);
  await expect(admin.getByRole('link', { name: 'Categories', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.getByRole('combobox', { name: 'Coven' })).toHaveCount(0);
});

test('a tabbed page holds its pills in the page header line', async ({ page }) => {
  await signInAgainAs(page, users.admin.id);
  await page.setViewportSize(DESKTOP);
  await page.goto('/admin/categories');

  const pills = page.getByRole('navigation', { name: 'Categories', exact: true });
  await expect(pills.getByRole('link', { name: 'Categories', exact: true })).toBeVisible();
  await expect(pills.getByRole('link', { name: 'Groups', exact: true })).toBeVisible();

  const heading = await page
    .getByRole('main')
    .getByRole('heading', { level: 1, name: 'Categories' })
    .boundingBox();
  const row = await pills.boundingBox();
  expect(row!.y).toBeGreaterThanOrEqual(heading!.y - 1);
  expect(row!.y).toBeLessThanOrEqual(heading!.y + heading!.height);
});

test('a signed-in non-admin meets the 403 inside the shell', async ({ page }) => {
  await signInAgainAs(page, users.plain.id);
  await page.setViewportSize(DESKTOP);

  const response = await page.goto('/admin');

  expect(response?.status()).toBe(403);
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('banner').getByRole('link', { name: 'Admin' })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Site' })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Admin' })).toHaveCount(0);
});

test('at a phone the coven nav is the bottom bar and the keyboard reaches the whole shell', async ({
  page,
}) => {
  await signInAgainAs(page, users.member.id);
  await page.setViewportSize(PHONE);
  await page.goto(`/coven/${ALPHA.slug}`);

  const nav = page.getByRole('navigation', { name: 'Coven' });
  const overview = nav.getByRole('link', { name: 'Overview', exact: true });
  await expect(overview).toBeVisible();
  const box = await nav.boundingBox();
  expect(box!.y + box!.height).toBeGreaterThanOrEqual(PHONE.height - 2);
  expect(box!.y + box!.height).toBeLessThanOrEqual(PHONE.height + 0.5);

  // The theme switch stays in the bar at a phone's width too (the owner's
  // call, M10.32), and the account panel no longer carries one.
  const account = page.getByRole('banner').getByRole('button', { name: 'Fixture Person' });
  await expect(
    page.getByRole('banner').getByRole('button', { name: 'Toggle light and dark mode' }),
  ).toBeVisible();

  // From the top: the skip link, then the brand, then the rest. Bounded.
  await page.reload();
  await expect(overview).toBeVisible();
  const focused = async () =>
    page.evaluate(() => {
      const el = document.activeElement;
      return el
        ? `${el.tagName}|${el.textContent?.trim() ?? ''}|${el.getAttribute('aria-label') ?? ''}`
        : '';
    });
  await page.keyboard.press('Tab');
  expect(await focused()).toContain('Skip to Content');
  await page.keyboard.press('Tab');
  expect(await focused()).toContain('Sorrel & Salt');

  const targets = [account, page.getByRole('combobox', { name: 'Coven' }), overview];
  const reached = new Set<number>();
  for (let i = 0; i < 12 && reached.size < targets.length; i++) {
    await page.keyboard.press('Tab');
    for (const [index, target] of targets.entries()) {
      if (await target.evaluate((element) => element === document.activeElement)) {
        reached.add(index);
      }
    }
  }
  expect([...reached].sort()).toEqual([0, 1, 2]);
});

test('at a phone the admin nav folds its later tabs behind More', async ({ page }) => {
  await signInAgainAs(page, users.admin.id);
  await page.setViewportSize(PHONE);
  await page.goto('/admin/categories');

  const admin = page.getByRole('navigation', { name: 'Admin' });
  const more = admin.getByRole('button', { name: 'More', exact: true });
  await expect(more).toHaveAttribute('aria-expanded', 'false');
  await expect(admin.getByRole('link', { name: 'Astrology', exact: true })).toHaveCount(0);

  await more.click();
  await expect(more).toHaveAttribute('aria-expanded', 'true');
  await expect(admin.getByRole('link', { name: 'Astrology', exact: true })).toBeVisible();
  await expect(admin.getByRole('link', { name: 'People', exact: true })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(more).toHaveAttribute('aria-expanded', 'false');
  await expect(more).toBeFocused();
});

// One scan per page template at each width, in both themes (MB.116): the
// shell is the frame all three share, so its surfaces are checked here.
const PAGES = [
  ['a coven page', 'member', `/coven/${ALPHA.slug}`, 'Coven'],
  ['an admin tabbed page', 'admin', '/admin/categories', 'Admin'],
  ['the account page', 'member', '/account', null],
] as const;

for (const [name, who, path, nav] of PAGES) {
  for (const viewport of [DESKTOP, PHONE]) {
    test(`${name} passes the scans at ${viewport.width}px in both themes`, async ({ page }) => {
      await signInAgainAs(page, users[who].id);
      await page.setViewportSize(viewport);
      await page.goto(path);
      await expect(page.getByRole('banner')).toBeVisible();
      await expect(page.getByRole('main')).toBeVisible();
      if (nav) await expect(page.getByRole('navigation', { name: nav })).toBeVisible();

      await assertNoAccessibilityViolations(page);
      await toggleTheme(page);
      await assertNoAccessibilityViolations(page);
      if (viewport === PHONE) await assertNoSidewaysScroll(page);
    });
  }
}

// The row wider than the phone fits the window (MB.7's review): four labelled tabs
// and More outran it from 642px up, so the tabs that do not fit sit behind More
// (with no gap between tabs all six fit by 882px, and More goes).
for (const width of [642, 768, 882]) {
  test(`the admin row fits the window at ${width}px, without overflowing`, async ({ page }) => {
    await signInAgainAs(page, users.admin.id);
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/admin');

    const nav = page.getByRole('navigation', { name: 'Admin' });
    await expect(nav).toBeVisible();
    // Either More holds the tabs that do not fit, or all of them fit and are
    // in view; never a tab cut off with neither.
    const more = nav.getByRole('button', { name: /More|Astrology|People|Deities/ });
    if ((await more.count()) > 0) {
      await expect(more).toBeVisible();
    } else {
      for (const link of await nav.getByRole('link').all()) await expect(link).toBeVisible();
    }
    await expect(nav.getByRole('link').first()).toBeVisible();
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(fits).toBe(true);
  });
}
