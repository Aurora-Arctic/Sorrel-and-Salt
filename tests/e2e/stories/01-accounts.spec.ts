import { test, expect } from '../fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll, settleTransitions } from '../axe';
import { recreateE2eDatabase } from '../database';
import { signInAgainAs } from '../session';
import type { Locator, Page } from '@playwright/test';
import { makeCoven, makeUser, seatsOf, withSql } from './accounts-setup';

// Stories 1, 2, 3 and 8, walked in the browser against the built server:
// signing in, the landing an account with no coven meets, creating a coven,
// and moving between covens. The people and covens each story starts from
// are written by SQL (accounts-setup.ts); the step the story is about goes
// through the page.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

// The slot servers blank every provider's credentials (playwright.config.ts),
// so each button is drawn greyed with aria-disabled, the state checked here
// with or without a developer's .env.local. A live OAuth round trip is
// run by hand against real credentials: CI cannot finish one, so
// Story 1 is walked up to the provider's door.
const PROVIDER_NAMES = ['Discord', 'Google', 'Facebook', 'Microsoft'];

/** Scans `page` in each theme in turn: a Playwright page is light unless told. */
async function scanBothThemes(page: Page): Promise<void> {
  for (const colorScheme of ['dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme });
    await settleTransitions(page);
    await assertNoAccessibilityViolations(page);
  }
}

/** Presses Tab until `target` holds the focus, bounded so a lost focus fails rather than hangs. */
async function tabTo(page: Page, target: Locator): Promise<boolean> {
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab');
    if (await target.evaluate((element) => element === document.activeElement)) return true;
  }
  return false;
}

test.describe('signing in', () => {
  test(
    'a visitor follows Sign In from the front door to every roster provider, each reachable by keyboard',
    { tag: '@story-1' },
    async ({ page }) => {
      await page.goto('/');
      await page.getByRole('main').getByRole('link', { name: 'Sign In', exact: true }).click();
      await expect(page).toHaveURL(/\/sign-in$/);

      for (const name of PROVIDER_NAMES) {
        const button = page.getByRole('button', { name: `Continue with ${name}` });
        await expect(button).toBeVisible();
        // Pins the greyed state: a server that picked up credentials would
        // pass the scans below on a page this test is not about.
        await expect(button).toHaveAttribute('aria-disabled', 'true');
      }
      await assertNoAccessibilityViolations(page);
      await assertNoSidewaysScroll(page);

      // Real Tab presses from a fresh load, so the count starts at the top.
      // aria-disabled, not the disabled attribute, is what keeps a greyed
      // button in the tab order (claude-docs/components/sign-in-panel.md).
      await page.reload();
      await expect(page.getByRole('button', { name: 'Continue with Discord' })).toBeVisible();
      const focusedNames = new Set<string>();
      // The theme toggle plus the four buttons; a few spare presses tolerate
      // another tab stop without under-covering the roster.
      for (let i = 0; i < PROVIDER_NAMES.length + 3; i++) {
        await page.keyboard.press('Tab');
        const text = await page.evaluate(() => document.activeElement?.textContent?.trim());
        if (text) focusedNames.add(text);
      }
      for (const name of PROVIDER_NAMES) {
        expect([...focusedNames].some((text) => text.includes(name))).toBe(true);
      }
    },
  );

  test(
    'a provider callback that fails returns the visitor to the sign-in page with an alert',
    { tag: '@story-1' },
    async ({ page }) => {
      await page.goto('/sign-in?error=access_denied');
      // Scoped to the page's own main: Next portals an empty alert-role route
      // announcer into the body on every page.
      await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
      // The way back in is still offered beside it.
      await expect(page.getByRole('button', { name: 'Continue with Discord' })).toBeVisible();
      await assertNoAccessibilityViolations(page);
    },
  );
});

test.describe('the landing an account with no coven meets', () => {
  test(
    'a new account in no coven continues to the landing, which lists no coven and offers no way to create one',
    { tag: '@story-2' },
    async ({ page }) => {
      const userId = await makeUser(page, 'newcomer@accounts-story.test', 'Fixture Newcomer');
      const [row] = await withSql(
        (sql) => sql`select can_create_workspace from users where id = ${userId}`,
      );
      expect(row.can_create_workspace).toBe(false);

      // Signed in, the front door's way in is the landing, not sign-in again.
      await page.goto('/');
      await expect(page.getByRole('link', { name: 'Sign In', exact: true })).toHaveCount(0);
      await page.getByRole('link', { name: 'Continue', exact: true }).click();
      await expect(page).toHaveURL(/\/coven$/);

      // The landing's own section says what to do next; with nothing to open,
      // there is no switcher, no coven nav and no Create Coven, and no notice
      // of an invitation, since none is waiting.
      const main = page.getByRole('main');
      await expect(main.getByRole('region')).toBeVisible();
      await expect(page.getByRole('combobox', { name: 'Coven' })).toHaveCount(0);
      await expect(page.getByRole('navigation', { name: 'Coven' })).toHaveCount(0);
      await expect(main.getByRole('link', { name: 'Create Coven', exact: true })).toHaveCount(0);
      await expect(main.getByRole('status')).toHaveCount(0);
      await scanBothThemes(page);
      await assertNoSidewaysScroll(page);
    },
  );

  test(
    'a new account with an invitation waiting is told so on the landing and led to it',
    { tag: '@story-2' },
    async ({ page }) => {
      const email = 'invited-newcomer@accounts-story.test';
      const owner = await makeUser(page, 'host@accounts-story.test', 'Fixture Host');
      const coven = await makeCoven('Fixture Waiting Coven', [[owner, 'owner']]);
      await makeUser(page, email, 'Fixture Invitee');
      await withSql(
        (sql) => sql`
          insert into invitations (email, token_hash, workspace_id, role, created_by, updated_by)
          values (${email}, ${`${email}-hash`}, ${coven.id}, 'member', ${owner}, ${owner})`,
      );

      await page.goto('/coven');
      const notice = page.getByRole('main').getByRole('status');
      await expect(notice).toBeVisible();
      await assertNoAccessibilityViolations(page);
      // Still no coven: the invitation is waiting, not accepted.
      await expect(page.getByRole('combobox', { name: 'Coven' })).toHaveCount(0);

      await notice.getByRole('link').click();
      await expect(page).toHaveURL(/\/account#/);
    },
  );
});

test.describe('creating a coven', () => {
  // Serial inside this block only: each test reads the holder or outsider id,
  // and the coven, the one before it made.
  test.describe.configure({ mode: 'serial' });

  const holder = { id: '' };
  const outsider = { id: '' };

  test(
    'a holder of the right starts from the landing, names a coven from the keyboard and lands in it as its owner',
    { tag: ['@story-2', '@story-3'] },
    async ({ page }) => {
      holder.id = await makeUser(page, 'holder@accounts-story.test', 'Fixture Holder', {
        canCreate: true,
      });

      // Before they have a coven, the landing offers the create page.
      await page.goto('/coven');
      const create = page
        .getByRole('main')
        .getByRole('link', { name: 'Create Coven', exact: true });
      await expect(create).toBeVisible();
      await scanBothThemes(page);
      await assertNoSidewaysScroll(page);

      await create.click();
      await expect(page).toHaveURL(/\/coven\/new$/);
      const name = page.getByRole('textbox', { name: 'Name' });
      await expect(name).toBeVisible();
      await scanBothThemes(page);
      await assertNoSidewaysScroll(page);

      expect(await tabTo(page, name)).toBe(true);
      await page.keyboard.type('Fixture Coven');
      await page.keyboard.press('Enter');

      await expect(page).toHaveURL(/\/coven\/fixture-coven$/);
      await expect(page.getByRole('heading', { level: 1, name: 'Fixture Coven' })).toBeVisible();
      // Delete is drawn by the owner's permission: the page agrees with the row.
      await expect(
        page.getByRole('main').getByRole('button', { name: 'Delete Coven', exact: true }),
      ).toBeVisible();
      const [made] = await withSql(
        (sql) => sql`select id from workspaces where slug = 'fixture-coven'`,
      );
      expect(await seatsOf(made.id)).toEqual({ [holder.id]: 'owner' });
    },
  );

  test(
    'the holder makes a second coven of the same name from the switcher, at an address of its own, and one named New never takes the create page’s',
    { tag: '@story-3' },
    async ({ page }) => {
      await signInAgainAs(page, holder.id);
      await page.goto('/coven/fixture-coven');

      // The right is not used up by the first coven: the switcher still offers it.
      await page.getByRole('combobox', { name: 'Coven' }).click();
      await page.getByRole('option', { name: 'Create Coven', exact: true }).click();
      await expect(page).toHaveURL(/\/coven\/new$/);
      await page.getByRole('textbox', { name: 'Name' }).fill('Fixture Coven');
      await page.getByRole('button', { name: 'Create Coven', exact: true }).click();

      await expect(page).toHaveURL(/\/coven\/fixture-coven-[^/]+$/);
      await expect(page.getByRole('heading', { level: 1, name: 'Fixture Coven' })).toBeVisible();
      const second = new URL(page.url()).pathname.split('/')[2];
      const [made] = await withSql((sql) => sql`select id from workspaces where slug = ${second}`);
      expect(await seatsOf(made.id)).toEqual({ [holder.id]: 'owner' });

      await page.goto('/coven/new');
      await page.getByRole('textbox', { name: 'Name' }).fill('New');
      await page.getByRole('button', { name: 'Create Coven', exact: true }).click();
      await expect(page).toHaveURL(/\/coven\/new-2$/);
      await expect(page.getByRole('heading', { level: 1, name: 'New' })).toBeVisible();

      // The address is still the create page, not the coven called New.
      const again = await page.goto('/coven/new');
      expect(again?.status()).toBe(200);
      await expect(page.getByRole('textbox', { name: 'Name' })).toBeVisible();
    },
  );

  test(
    'a user without the right finds no way to create a coven, and the create page offers them no form',
    { tag: '@story-3' },
    async ({ page }) => {
      outsider.id = await makeUser(page, 'outsider@accounts-story.test', 'Fixture Outsider');
      const rights = await withSql(
        (sql) => sql`
          select id, can_create_workspace from users where id in ${sql([holder.id, outsider.id])}`,
      );
      expect(Object.fromEntries(rights.map((row) => [row.id, row.can_create_workspace]))).toEqual({
        [holder.id]: true,
        [outsider.id]: false,
      });

      // In no coven, the landing offers them nothing to create.
      await page.goto('/coven');
      await expect(page.getByRole('main').getByRole('region')).toBeVisible();
      await expect(
        page.getByRole('main').getByRole('link', { name: 'Create Coven', exact: true }),
      ).toHaveCount(0);

      // By its address, the create page answers with a notice and no form.
      const response = await page.goto('/coven/new');
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('main').getByRole('status')).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Name' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Create Coven', exact: true })).toHaveCount(0);
      await scanBothThemes(page);
      await assertNoSidewaysScroll(page);

      // Seated in the holder's coven, their switcher lists it and still
      // offers no Create Coven, where the holder's does.
      const [coven] = await withSql(
        (sql) => sql`select id from workspaces where slug = 'fixture-coven'`,
      );
      await withSql(
        (sql) => sql`
          insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
          values (${coven.id}, ${outsider.id}, 'member', ${holder.id}, ${holder.id})`,
      );
      for (const [who, offered] of [
        [holder.id, 1],
        [outsider.id, 0],
      ] as const) {
        await signInAgainAs(page, who);
        await page.goto('/coven/fixture-coven');
        await page.getByRole('combobox', { name: 'Coven' }).click();
        await expect(page.getByRole('option', { name: 'Fixture Coven' }).first()).toBeVisible();
        await expect(page.getByRole('option', { name: 'Create Coven', exact: true })).toHaveCount(
          offered,
        );
        await page.keyboard.press('Escape');
      }
    },
  );

  test(
    'an admin, who holds the right by being one, goes to Your Coven and creates a coven',
    { tag: '@story-3' },
    async ({ page, isMobile }) => {
      const admin = await makeUser(page, 'admin@accounts-story.test', 'Fixture Admin', {
        role: 'admin',
      });

      await page.goto('/admin');
      // Below the tablet width the bar's site links are hidden and move into
      // the account menu's panel, so a phone opens the menu to reach Your Coven.
      if (isMobile) {
        await page.getByRole('banner').getByRole('button', { name: 'Fixture Admin' }).click();
        await page
          .getByRole('banner')
          .getByRole('link', { name: 'Your Coven', exact: true })
          .click();
      } else {
        await page
          .getByRole('navigation', { name: 'Site' })
          .getByRole('link', { name: 'Your Coven', exact: true })
          .click();
      }
      await expect(page).toHaveURL(/\/coven$/);
      await page.getByRole('main').getByRole('link', { name: 'Create Coven', exact: true }).click();
      await expect(page).toHaveURL(/\/coven\/new$/);

      await page.getByRole('textbox', { name: 'Name' }).fill('Fixture Admin Coven');
      await page.getByRole('button', { name: 'Create Coven', exact: true }).click();

      await expect(page).toHaveURL(/\/coven\/fixture-admin-coven$/);
      await expect(
        page.getByRole('main').getByRole('button', { name: 'Delete Coven', exact: true }),
      ).toBeVisible();
      const [made] = await withSql(
        (sql) => sql`select id from workspaces where slug = 'fixture-admin-coven'`,
      );
      expect(await seatsOf(made.id)).toEqual({ [admin]: 'owner' });
    },
  );
});

test(
  'a member of several covens switches between them and stays in the same section, wherever the address says',
  { tag: ['@story-8', '@story-3'] },
  async ({ page }) => {
    const traveller = await makeUser(page, 'traveller@accounts-story.test', 'Fixture Traveller', {
      canCreate: true,
    });
    const alpha = await makeCoven('Fixture Alpha', [[traveller, 'owner']]);
    const beta = await makeCoven('Fixture Beta', [[traveller, 'owner']]);
    const host = await makeUser(page, 'gamma-host@accounts-story.test', 'Fixture Gamma Host');
    // A viewer there, who cannot open its members page.
    const gamma = await makeCoven('Fixture Gamma', [
      [host, 'owner'],
      [traveller, 'viewer'],
    ]);
    await signInAgainAs(page, traveller);

    await page.goto(`/coven/${alpha.slug}`);
    await page
      .getByRole('navigation', { name: 'Coven' })
      .getByRole('link', { name: 'Members', exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/coven/${alpha.slug}/members$`));
    const switcher = page.getByRole('combobox', { name: 'Coven' });
    await expect(switcher).toHaveText('Fixture Alpha');

    // Another coven, the same section.
    await switcher.click();
    await expect(page.getByRole('option', { name: 'Fixture Beta', exact: true })).toBeVisible();
    await assertNoAccessibilityViolations(page);
    await page.getByRole('option', { name: 'Fixture Beta', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/coven/${beta.slug}/members$`));
    await expect(page.getByRole('combobox', { name: 'Coven' })).toHaveText('Fixture Beta');
    await expect(page.getByRole('table', { name: 'Members' })).toBeVisible();
    await expect(
      page
        .getByRole('navigation', { name: 'Coven' })
        .getByRole('link', { name: 'Members', exact: true }),
    ).toHaveAttribute('aria-current', 'page');

    // The place is the address's, not the session's: a second tab sits in
    // another coven, and neither moves the other.
    const second = await page.context().newPage();
    await signInAgainAs(second, traveller);
    await second.goto(`/coven/${alpha.slug}`);
    await expect(second.getByRole('combobox', { name: 'Coven' })).toHaveText('Fixture Alpha');
    await page.reload();
    await expect(page).toHaveURL(new RegExp(`/coven/${beta.slug}/members$`));
    await expect(page.getByRole('combobox', { name: 'Coven' })).toHaveText('Fixture Beta');
    await second.close();

    // Where they cannot open the section, they land on the coven's own page
    // rather than a 404.
    await page.getByRole('combobox', { name: 'Coven' }).click();
    await page.getByRole('option', { name: 'Fixture Gamma', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/coven/${gamma.slug}$`));
    await expect(page.getByRole('heading', { level: 1, name: 'Fixture Gamma' })).toBeVisible();

    // From a coven's own page, to the next coven's.
    await page.getByRole('combobox', { name: 'Coven' }).click();
    await page.getByRole('option', { name: 'Fixture Alpha', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/coven/${alpha.slug}$`));
    await expect(page.getByRole('combobox', { name: 'Coven' })).toHaveText('Fixture Alpha');

    // A holder of the right also reaches the create page from it.
    await page.getByRole('combobox', { name: 'Coven' }).click();
    await page.getByRole('option', { name: 'Create Coven', exact: true }).click();
    await expect(page).toHaveURL(/\/coven\/new$/);
    await expect(page.getByRole('textbox', { name: 'Name' })).toBeVisible();
  },
);
