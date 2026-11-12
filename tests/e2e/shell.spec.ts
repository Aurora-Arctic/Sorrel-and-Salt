import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { BREAKPOINTS, DESKTOP_WIDTH, PHONE_WIDTH, PURPOSE_WIDTHS } from './breakpoints';
import {
  assertNoAccessibilityViolations,
  assertNoSidewaysScroll,
  scanBothThemes,
  settleTransitions,
} from './axe';
import { recreateE2eDatabase, withE2eSql } from './database';
import { signInAgainAs, signInAs } from './session';
import { holdPageScripts } from './hold-server-answers';
import { slotUrl } from './slots';
import { insertWorkspace } from '../support/db/insert-workspace';

// What a component test cannot prove: where the browser lays the bottom bar, which element takes the focus after a key, and the scans over the whole frame.

const ALPHA = { name: 'Shell Alpha', slug: 'shell-alpha' };
const BETA = { name: 'Shell Beta', slug: 'shell-beta' };
const PHONE = { width: PHONE_WIDTH, height: 812 };
const DESKTOP = { width: DESKTOP_WIDTH, height: 800 };

const users = {
  member: { id: '' }, // a member of Alpha alone
  multi: { id: '' }, // a member of both, holding the right to create
  admin: { id: '' },
  stewardKeeper: { id: '' }, // a keeper, so a steward of the demo coven, who also owns Gamma
};

test.beforeAll(async ({ browser, slot }) => {
  await recreateE2eDatabase();

  // Only the rows matter: the page and its session are thrown away.
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
        await signInAs(
          page,
          `${key.toLowerCase()}@shell.test`,
          ['discord'],
          key === 'admin' || key === 'stewardKeeper' ? 'admin' : 'user',
        )
      ).userId,
    };
  }

  await withE2eSql(async (sql) => {
    await sql.begin(async (tx) => {
      await tx`select set_config('app.privilege_route', 'manual', true)`;
      await tx`update users set can_create_workspace = true where id = ${users.multi.id}`;
    });
    const owner = users.multi.id;
    for (const coven of [ALPHA, BETA]) {
      const members: [string, 'owner' | 'member'][] =
        coven === ALPHA
          ? [
              [owner, 'owner'],
              [users.member.id, 'member'],
            ]
          : [[owner, 'owner']];
      await insertWorkspace(sql, coven.name, members, { slug: coven.slug, author: owner });
    }
    const keeper = users.stewardKeeper.id;
    await insertWorkspace(sql, 'Shell Gamma', [[keeper, 'owner']], { author: keeper });
    const rows = await sql`
      select count(*)::int as n from workspace_members m
      join workspaces w on w.id = m.workspace_id
      where m.deleted_at is null and w.slug in ${sql([ALPHA.slug, BETA.slug])}`;
    expect(rows[0].n).toBe(3);
  });
}

test('a member on the coven page sees the bar, the coven nav and the account panel', async ({
  page,
}) => {
  await signInAgainAs(page, users.member.id);
  await page.setViewportSize(DESKTOP);
  await page.goto(`/coven/${ALPHA.slug}`);

  const banner = page.getByRole('banner');
  await expect(banner).toBeVisible();
  await expect(banner.getByRole('link', { name: 'Sorrel & Salt' })).toHaveAttribute('href', '/');
  await expect(
    page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'Compendium' }),
  ).toBeVisible();
  await expect(banner.getByRole('link', { name: 'Curator', exact: true })).toHaveCount(0);
  await expect(banner.getByRole('link', { name: 'Keepers', exact: true })).toHaveCount(0);
  await expect(banner.getByRole('link', { name: /^Your Covens?$/ }).first()).toBeVisible();

  const coven = page.getByRole('navigation', { name: 'Coven' });
  await expect(coven.getByRole('link', { name: 'Overview', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.getByRole('combobox', { name: 'Coven' })).toHaveText(ALPHA.name);
  await expect(banner.getByRole('button', { name: 'Add Ingredient', exact: true })).toBeEnabled();

  const account = banner.getByRole('button', { name: 'Fixture Person' });
  await expect(account).toHaveAttribute('aria-expanded', 'false');
  await account.click();
  await expect(account).toHaveAttribute('aria-expanded', 'true');
  await expect(banner.getByRole('link', { name: 'Your Account', exact: true })).toHaveAttribute(
    'href',
    '/account',
  );
  // Sign Out is refused by route, not awaited from Better Auth, since whether it refuses depends on the origin the browser reaches the server on (claude-docs/components/click-feedback.md).
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
  // Sweep gap: the banner with the Sign Out failure alert shown.
  await assertNoAccessibilityViolations(page);
  await page.unroute('**/api/auth/sign-out');

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

  const account = page.getByRole('banner').getByRole('button', { name: 'Fixture Person' });
  await expect(
    page.getByRole('banner').getByRole('button', { name: 'Toggle light and dark mode' }),
  ).toBeVisible();

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

test('at a phone the curator nav folds its later tabs behind More', async ({ page }) => {
  await signInAgainAs(page, users.admin.id);
  await page.setViewportSize(PHONE);
  await page.goto('/curator/categories');

  const admin = page.getByRole('navigation', { name: 'Curator' });
  const more = admin.getByRole('button', { name: 'More', exact: true });
  await expect(more).toHaveAttribute('aria-expanded', 'false');
  await expect(admin.getByRole('link', { name: 'Astrology', exact: true })).toHaveCount(0);

  await more.click();
  await expect(more).toHaveAttribute('aria-expanded', 'true');
  await expect(admin.getByRole('link', { name: 'Astrology', exact: true })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(more).toHaveAttribute('aria-expanded', 'false');
  await expect(more).toBeFocused();
});

const PAGES = [
  ['a coven page', 'member', `/coven/${ALPHA.slug}`, 'Coven'],
  ['a curator tabbed page', 'admin', '/curator/categories', 'Curator'],
  ['the account page', 'member', '/account', null],
] as const;

for (const [name, who, path, nav] of PAGES) {
  test(`${name} does not scroll sideways at ${PHONE.width}px`, async ({ page }) => {
    await signInAgainAs(page, users[who].id);
    await page.setViewportSize(PHONE);
    await page.goto(path);
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
    if (nav) await expect(page.getByRole('navigation', { name: nav })).toBeVisible();

    // Sweep gap: a coven page, the curator categories page and the account page at PHONE_WIDTH; the sweep scans them at desktop width.
    await scanBothThemes(page);
    await assertNoSidewaysScroll(page);
  });
}

// The bar's end group, the add button with its menu through the theme toggle, once ran past the window
// at 420px while 375px held. The brand is its initials up to the brand edge and the full name past it,
// so the tightest window with each is checked. The menu shows for a viewer with two places to add to:
// a keeper with a coven seat, as every keeper holds in the demo coven, and the owner of two covens on a coven page, since the bar is every signed-in page's.
for (const [edge, width] of [
  ['the widest window with the brand as initials', BREAKPOINTS.brandInitialsTo],
  ['the narrowest window with the full brand', BREAKPOINTS.brandInitialsTo + 1],
] as const) {
  for (const [name, path] of [
    ['the curator compendium', '/curator/compendium'],
    ['a coven page', `/coven/${ALPHA.slug}`],
  ] as const) {
    test(`${name} does not scroll sideways at ${width}px, ${edge}`, async ({ page }) => {
      await signInAgainAs(
        page,
        path === '/curator/compendium' ? users.stewardKeeper.id : users.multi.id,
      );
      await page.setViewportSize({ width, height: 812 });
      await page.goto(path);

      // Why it could overflow: every control of the end group is in the bar.
      const bar = page.getByRole('banner');
      await expect(bar.getByRole('button', { name: 'Add Ingredient', exact: true })).toBeVisible();
      await expect(bar.getByRole('button', { name: 'Choose Where to Add' })).toBeVisible();
      await expect(bar.getByRole('button', { name: 'Toggle light and dark mode' })).toBeVisible();
      await assertNoSidewaysScroll(page, { width });
    });
  }
}

// The row wider than the phone fits the window: four labelled tabs and More outran it from just past the phone edge up, so
// tabs that do not fit sit behind More.
test('the curator row fits the window just past the phone edge, without overflowing', async ({
  page,
}) => {
  await signInAgainAs(page, users.admin.id);
  await page.setViewportSize({ width: BREAKPOINTS.phone + 1, height: 800 });
  await page.goto('/curator');

  // The stylesheet draws every tab until the fit script runs, so the branch
  // below waits for the fit: read before it, the test could take the all-tabs
  // branch and then see the script hide a tab (the gate's one flaky test).
  const nav = await fittedAdminNav(page);
  await expect(nav).toBeVisible();
  const more = nav.getByRole('button', { name: 'More', exact: true });
  if ((await more.count()) > 0) {
    await expect(more).toBeVisible();
  } else {
    for (const link of await nav.getByRole('link').all()) await expect(link).toBeVisible();
  }
  await expect(nav.getByRole('link').first()).toBeVisible();
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(fits).toBe(true);
});

// A hidden tab is drawn but not visible.
const rowLinks = (nav: Locator) => nav.getByRole('link').filter({ visible: true });

async function fittedAdminNav(page: Page): Promise<Locator> {
  const nav = page.getByRole('navigation', { name: 'Curator' });
  await expect(nav).toHaveAttribute('data-fit', '');
  return nav;
}

const rowOverflows = (nav: Locator) =>
  nav
    .getByRole('list')
    .first()
    .evaluate((list) => list.scrollWidth > list.clientWidth + 1);

test('at a tablet width, More stays More and carries the current page when its tab is hidden behind it', async ({
  page,
}) => {
  await signInAgainAs(page, users.admin.id);
  await page.setViewportSize({ width: BREAKPOINTS.phone + 1, height: 800 });

  // Why More could carry it: on a page whose tab is in the row it does not.
  await page.goto('/curator');
  let nav = await fittedAdminNav(page);
  const more = nav.getByRole('button', { name: 'More', exact: true });
  await expect(more).toBeVisible();
  await expect(more).not.toHaveAttribute('aria-current');

  await page.goto('/curator/zodiac-signs');
  nav = await fittedAdminNav(page);
  await expect(rowLinks(nav).filter({ hasText: 'Astrology' })).toHaveCount(0);
  await expect(nav.getByRole('button', { name: 'More', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

// The current tab is heavier, so wider: the row is fitted afresh on each navigation. At 681px Forms current
// fits three tabs and More where Compendium current fits two (the remote browser's fonts), so a fit kept
// from Forms would overflow on Compendium.
test('at a tablet width, a navigation fits the row afresh for the new current tab', async ({
  page,
}) => {
  await signInAgainAs(page, users.admin.id);
  // From about 774px to 780px in Chromium, the bolder current tab tips the count.
  await page.setViewportSize({ width: PURPOSE_WIDTHS.shellTabs, height: 800 });
  await page.goto('/curator/compendium');
  const fresh = await rowLinks(await fittedAdminNav(page)).count();

  await page.goto('/curator/forms');
  const nav = await fittedAdminNav(page);
  // Why it could have kept the old count: the forms page fits a different one.
  expect(await rowLinks(nav).count()).not.toBe(fresh);
  const compendium = rowLinks(nav).filter({ hasText: 'Compendium' });
  await expect(compendium).toHaveCount(1);

  await compendium.click();
  await expect(page).toHaveURL(/\/curator\/compendium$/);
  await expect(nav.getByRole('link', { name: 'Compendium', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect.poll(() => rowLinks(nav).count()).toBe(fresh);
  expect(await rowOverflows(nav)).toBe(false);
  await assertNoSidewaysScroll(page);
});

test('at a desktop width, once fitted, the curator row shows every tab and draws no More', async ({
  page,
}) => {
  await signInAgainAs(page, users.admin.id);
  await page.setViewportSize(DESKTOP);
  await page.goto('/curator');

  const nav = await fittedAdminNav(page);
  await expect(rowLinks(nav)).toHaveCount(6);
  await expect(nav.getByRole('button')).toHaveCount(0);
  expect(await rowOverflows(nav)).toBe(false);
});

// The server cannot know the window's width, so it draws the phone's four tabs and More; wider, the stylesheet
// must show every tab from the first paint. The script's chunks are held so the page never hydrates during
// the assertions.
test('before the script runs, a desktop curator row shows every tab and no More', async ({
  page,
}) => {
  await signInAgainAs(page, users.admin.id);
  await page.setViewportSize(DESKTOP);

  const scripts = await holdPageScripts(page);
  await page.goto('/curator', { waitUntil: 'commit' });

  const admin = page.getByRole('navigation', { name: 'Curator' });
  await expect(admin).toBeVisible();
  await expect(admin.getByRole('link')).toHaveCount(6);
  for (const link of await admin.getByRole('link').all()) await expect(link).toBeVisible();
  await expect(admin.getByRole('button')).toHaveCount(0);

  const hrefs = await admin
    .getByRole('link')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  expect(new Set(hrefs).size).toBe(6);
  scripts.release();
});

// More was once reserved as wide as the widest tab it hid, so at 680px the coven row showed Overview alone. Swept across the tablet band, as fonts move the edge.
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
  ['admin', 'Curator', '/curator'],
] as const) {
  test(`across the tablet band, the ${label.toLowerCase()} row puts a tab behind More only when it has no room`, async ({
    page,
  }) => {
    await signInAgainAs(page, users[who].id);
    await page.goto(path);
    const nav = page.getByRole('navigation', { name: label });
    let tucked = 0;
    // From the phone edge to the tablet edge, in steps, resizing the one page.
    for (let width = BREAKPOINTS.phone + 1; width <= BREAKPOINTS.tablet + 1; width += 20) {
      await page.setViewportSize({ width, height: 800 });
      await expect(nav).toHaveAttribute('data-fit', '');
      // Polled: data-fit stays set from the last width, so only the settled row shows the refit.
      await expect
        .poll(
          async () => ({
            tuckedWithRoom: await tuckedWithRoom(nav),
            overflows: await rowOverflows(nav),
          }),
          {
            message: `the row at ${width}px leaves a tab hidden with room for it, or overflows`,
          },
        )
        .toEqual({ tuckedWithRoom: false, overflows: false });
      if ((await nav.getByRole('button', { name: /More/ }).count()) > 0) tucked += 1;
    }
    // Why it could have failed: some width in the sweep does put a tab behind More.
    expect(tucked).toBeGreaterThan(0);
  });
}

test('Sign Out on the public compendium loads it again signed out', async ({ page }) => {
  await signInAgainAs(page, users.member.id);
  await page.setViewportSize(DESKTOP);
  await page.goto('/compendium');

  const banner = page.getByRole('banner');
  await banner.getByRole('button', { name: 'Fixture Person' }).click();
  await banner.getByRole('button', { name: 'Sign Out', exact: true }).click();

  // The signed-out bar first, so the URL is read after the full load and not before it starts.
  await expect(banner.getByRole('link', { name: 'Sign In' }).first()).toBeVisible();
  await expect(banner.getByRole('button', { name: 'Fixture Person' })).toHaveCount(0);
  await expect(page).toHaveURL((url) => url.pathname === '/compendium');
});

test('Sign Out on a coven page loads the landing page', async ({ page }) => {
  await signInAgainAs(page, users.member.id);
  await page.setViewportSize(DESKTOP);
  await page.goto(`/coven/${ALPHA.slug}`);

  const banner = page.getByRole('banner');
  await banner.getByRole('button', { name: 'Fixture Person' }).click();
  await banner.getByRole('button', { name: 'Sign Out', exact: true }).click();

  await expect(page).toHaveURL((url) => url.pathname === '/');
  await expect(banner.getByRole('button', { name: 'Fixture Person' })).toHaveCount(0);
});
