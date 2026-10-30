import type { Locator, Page } from '@playwright/test';
import postgres from 'postgres';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll, settleTransitions } from './axe';
import { e2eDatabaseUrl, recreateE2eDatabase } from './database';
import { signInAgainAs, signInAs } from './session';
import { slotUrl } from './slots';

// The application shell against the built server: the bar, the context row and the section navs that frame
// every signed-in page, at a desktop and a phone's width. It proves what a component test cannot: where the
// browser lays the bottom bar, which element takes the focus after a key, and the scans over the whole frame.

const ALPHA = { name: 'Shell Alpha', slug: 'shell-alpha' };
const BETA = { name: 'Shell Beta', slug: 'shell-beta' };
const PHONE = { width: 375, height: 812 };
const DESKTOP = { width: 1280, height: 800 };

const users = {
  member: { id: '' }, // a member of Alpha alone
  multi: { id: '' }, // a member of both, holding the right to create
  admin: { id: '' },
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

/** The theme button, in the bar at every width. */
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
  // The brand leads to the front page, which redirects no one.
  await expect(banner.getByRole('link', { name: 'Sorrel & Salt' })).toHaveAttribute('href', '/');
  // A non-admin's Site nav holds the Compendium and, as a member, Your Coven; never Admin.
  await expect(
    page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'Compendium' }),
  ).toBeVisible();
  await expect(banner.getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0);
  await expect(banner.getByRole('link', { name: /^Your Covens?$/ }).first()).toBeVisible();

  const coven = page.getByRole('navigation', { name: 'Coven' });
  await expect(coven.getByRole('link', { name: 'Overview', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.getByRole('combobox', { name: 'Coven' })).toHaveText(ALPHA.name);
  // A member writes to the coven, so the bar offers Add Ingredient.
  await expect(banner.getByRole('button', { name: 'Add Ingredient', exact: true })).toBeEnabled();

  const account = banner.getByRole('button', { name: 'Fixture Person' });
  await expect(account).toHaveAttribute('aria-expanded', 'false');
  await account.click();
  await expect(account).toHaveAttribute('aria-expanded', 'true');
  await expect(banner.getByRole('link', { name: 'Your Account', exact: true })).toHaveAttribute(
    'href',
    '/account',
  );
  // Sign Out, refused: the refusal is routed rather than awaited from Better Auth, since whether it refuses
  // depends on the origin the browser reaches the server on. The panel stays open with a callout under the
  // button and the focus on it (claude-docs/components/click-feedback.md).
  await page.route('**/api/auth/sign-out', (route) =>
    route.fulfill({ status: 403, json: { code: 'INVALID_ORIGIN', message: 'Invalid origin' } }),
  );
  const signOut = banner.getByRole('button', { name: 'Sign Out', exact: true });
  await expect(signOut).toBeEnabled();
  await signOut.focus();
  await page.keyboard.press('Enter');
  const failure = banner.getByRole('alert');
  await expect(failure).toBeVisible();
  await expect(signOut).toBeEnabled();
  await expect(signOut).toBeFocused();
  await expect(banner.getByRole('button', { name: 'Show the error for Sign Out' })).toBeVisible();
  await settleTransitions(page);
  await assertNoAccessibilityViolations(page);
  await page.unroute('**/api/auth/sign-out');

  // The callout takes the first Escape and the menu stays open; the next
  // closes the menu.
  await page.keyboard.press('Escape');
  await expect(failure).toHaveCount(0);
  await expect(account).toHaveAttribute('aria-expanded', 'true');
  await expect(signOut).toBeFocused();
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
  await expect(
    page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'Compendium' }),
  ).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Coven' })).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Coven' })).toHaveCount(0);
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

  // The theme switch stays in the bar at a phone's width too, and the account panel no longer carries one.
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

// One scan per page template at each width, in both themes: the
// shell is the frame all three share, so its surfaces are checked here.
const PAGES = [
  ['a coven page', 'member', `/coven/${ALPHA.slug}`, 'Coven'],
  ['an admin tabbed page', 'admin', '/admin/categories', 'Admin'],
  ['the account page', 'member', '/account', null],
] as const;

for (const [name, who, path, nav] of PAGES) {
  // The account page at a desktop width is account.spec.ts's scan.
  for (const viewport of path === '/account' ? [PHONE] : [DESKTOP, PHONE]) {
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

// The row wider than the phone fits the window: four labelled tabs and More outran it from 642px up, so
// tabs that do not fit sit behind More. 768px is the tablet tests' below and a desktop width the last two tests'.
test('the admin row fits the window at 642px, without overflowing', async ({ page }) => {
  await signInAgainAs(page, users.admin.id);
  await page.setViewportSize({ width: 642, height: 800 });
  await page.goto('/admin');

  // The stylesheet draws every tab until the fit script runs, so the branch
  // below waits for the fit: read before it, the test could take the all-tabs
  // branch and then see the script hide a tab (the gate's one flaky test).
  const nav = await fittedAdminNav(page);
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
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(fits).toBe(true);
});

// Wider than the phone the row shows the leading tabs that fit and puts the rest behind More. These measure
// what a component test can only stand widths in for: which tabs are drawn, which control carries the
// current page, and whether the row overflows its box. A hidden tab is drawn but not visible.
const rowLinks = (nav: Locator) => nav.getByRole('link').filter({ visible: true });

/** The admin nav once the script has fitted its row. */
async function fittedAdminNav(page: Page): Promise<Locator> {
  const nav = page.getByRole('navigation', { name: 'Admin' });
  await expect(nav).toHaveAttribute('data-fit', '');
  return nav;
}

/** Whether the row's tabs and More overflow the list that holds them. */
const rowOverflows = (nav: Locator) =>
  nav
    .getByRole('list')
    .first()
    .evaluate((list) => list.scrollWidth > list.clientWidth + 1);

test('at a tablet width, More carries the current page when its tab is hidden behind it', async ({
  page,
}) => {
  await signInAgainAs(page, users.admin.id);
  await page.setViewportSize({ width: 768, height: 800 });

  // Why More could carry it: on a page whose tab is in the row it does not.
  await page.goto('/admin');
  let nav = await fittedAdminNav(page);
  const more = nav.getByRole('button', { name: /More/ });
  await expect(more).toBeVisible();
  await expect(more).not.toHaveAttribute('aria-current');

  await page.goto('/admin/users');
  nav = await fittedAdminNav(page);
  await expect(rowLinks(nav).filter({ hasText: 'People' })).toHaveCount(0);
  await expect(nav.getByRole('button', { name: /People/ })).toHaveAttribute('aria-current', 'page');
});

// The current tab is heavier, so wider: the row is fitted afresh on each navigation. At 681px Forms current
// fits three tabs and More where Compendium current fits two (the remote browser's fonts), so a fit kept
// from Forms would overflow on Compendium.
test('at a tablet width, a navigation fits the row afresh for the new current tab', async ({
  page,
}) => {
  await signInAgainAs(page, users.admin.id);
  // A width where the bolder current tab tips the count: the compendium
  // page, loaded fresh, fits fewer tabs than the forms page does, whose
  // tabs all fit with no More. From about 880px to 889px in Chromium.
  await page.setViewportSize({ width: 884, height: 800 });
  await page.goto('/admin/compendium');
  const fresh = await rowLinks(await fittedAdminNav(page)).count();

  await page.goto('/admin/forms');
  const nav = await fittedAdminNav(page);
  // Why it could have kept the old count: the forms page fits a different one.
  expect(await rowLinks(nav).count()).not.toBe(fresh);
  const compendium = rowLinks(nav).filter({ hasText: 'Compendium' });
  await expect(compendium).toHaveCount(1);

  await compendium.click();
  await expect(page).toHaveURL(/\/admin\/compendium$/);
  await expect(nav.getByRole('link', { name: 'Compendium', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect.poll(() => rowLinks(nav).count()).toBe(fresh);
  expect(await rowOverflows(nav)).toBe(false);
  await assertNoSidewaysScroll(page);
});

test('at a desktop width, once fitted, the admin row shows every tab and draws no More', async ({
  page,
}) => {
  await signInAgainAs(page, users.admin.id);
  await page.setViewportSize(DESKTOP);
  await page.goto('/admin');

  const nav = await fittedAdminNav(page);
  await expect(rowLinks(nav)).toHaveCount(6);
  await expect(nav.getByRole('button')).toHaveCount(0);
  expect(await rowOverflows(nav)).toBe(false);
});

// The server cannot know the window's width, so it draws the phone's four tabs and More; wider, the stylesheet
// must show every tab from the first paint. The script's chunks are held so the page never hydrates during
// the assertions.
test('before the script runs, a desktop admin row shows every tab and no More', async ({
  page,
}) => {
  await signInAgainAs(page, users.admin.id);
  await page.setViewportSize(DESKTOP);

  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/_next/static/chunks/**/*.js', async (route) => {
    await held;
    await route.continue().catch(() => undefined);
  });
  await page.goto('/admin', { waitUntil: 'commit' });

  const admin = page.getByRole('navigation', { name: 'Admin' });
  await expect(admin).toBeVisible();
  await expect(admin.getByRole('link')).toHaveCount(6);
  for (const link of await admin.getByRole('link').all()) await expect(link).toBeVisible();
  await expect(admin.getByRole('button')).toHaveCount(0);

  // The server's markup still names every section, each tab once.
  const hrefs = await admin
    .getByRole('link')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  expect(new Set(hrefs).size).toBe(6);
  release();
});

// A tab goes behind More only when the row has no room for it. More was once reserved as wide as the widest tab
// it hid, so at 680px the coven row showed Overview alone. Each width puts the first hidden tab back in the row:
// that row must overflow, or the tab was hidden with room. Swept across the tablet band, as fonts move the edge.
async function tuckedWithRoom(nav: Locator): Promise<boolean> {
  return nav
    .getByRole('list')
    .first()
    .evaluate((list) => {
      const items = Array.from(list.children) as HTMLElement[];
      const more = items.find((item) => item.querySelector(':scope > button'));
      const hidden = items.filter(
        (item) => item !== more && getComputedStyle(item).display === 'none',
      );
      if (!more || hidden.length === 0) return false;
      const [first] = hidden;
      first!.style.display = 'flex';
      // With its last hidden tab back, the row draws no More.
      if (hidden.length === 1) more.style.display = 'none';
      const fits = list.scrollWidth <= list.clientWidth;
      first!.style.display = '';
      more.style.display = '';
      return fits;
    });
}

for (const [who, label, path] of [
  ['member', 'Coven', `/coven/${ALPHA.slug}`],
  ['admin', 'Admin', '/admin'],
] as const) {
  test(`across the tablet band, the ${label.toLowerCase()} row puts a tab behind More only when it has no room`, async ({
    page,
  }) => {
    await signInAgainAs(page, users[who].id);
    let tucked = 0;
    for (let width = 660; width <= 900; width += 20) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      const nav = page.getByRole('navigation', { name: label });
      await expect(nav).toHaveAttribute('data-fit', '');
      if ((await nav.getByRole('button', { name: /More/ }).count()) > 0) tucked += 1;
      expect(await tuckedWithRoom(nav), `a tab hidden with room for it at ${width}px`).toBe(false);
      expect(await rowOverflows(nav)).toBe(false);
    }
    // Why it could have failed: some width in the sweep does put a tab behind More.
    expect(tucked).toBeGreaterThan(0);
  });
}
