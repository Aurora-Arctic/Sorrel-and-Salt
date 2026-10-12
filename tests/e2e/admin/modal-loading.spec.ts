import type { Locator, Page, Request, Route as PlaywrightRoute } from '@playwright/test';
import { test, expect } from '../fixtures';
import { assertNoAccessibilityViolations } from '../axe';
import { recreateE2eDatabase } from '../database';
import { signInAs } from '../session';

// An admin's Edit and Add open their modal on the press (M9.18;
// claude-docs/components/modal.md, "Opening at once"), against the built
// server: the press's navigation is held at the network, so the modal must
// show its head and a status before the page that fills it arrives, then take
// the form into the same dialog once the navigation is let through. Closing
// while it loads keeps it closed when that navigation lands.
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

/** The dialog's contents marked busy: the skeleton, until the form arrives. */
const busy = (dialog: Locator) => dialog.locator('[aria-busy="true"]');

/**
 * Holds every request for `path` whose address opens a modal — the press's
 * navigation and any prefetch of it — until `release` is called, which lets
 * them through and resolves once the last has been answered.
 */
async function holdModalRequests(page: Page, path: string, param: string) {
  const held: PlaywrightRoute[] = [];
  let released = false;
  const opens = (url: URL) => url.pathname === path && url.searchParams.has(param);
  // Not `unroute` on release: it lets the held requests go itself.
  await page.route(opens, async (route) => {
    if (released) await route.continue();
    else held.push(route);
  });
  return {
    async release(): Promise<void> {
      released = true;
      const answered = held.map((route) => route.request());
      await Promise.all(held.map((route) => route.continue()));
      await Promise.all(answered.map((request: Request) => request.response()));
    },
  };
}

test(
  'an admin’s Edit opens its modal before its page arrives, and the form fills the same dialog',
  { tag: '@story-18' },
  async ({ page }) => {
    await signInAs(page, 'edit@admin-modal-loading.test', ['discord'], 'admin');
    await page.goto('/admin/categories');
    const gate = await holdModalRequests(page, '/admin/categories', 'edit');

    await page
      .getByRole('table')
      .getByRole('link', { name: /^Edit / })
      .first()
      .click();

    // Open on the press: the address has not moved, as the navigation is held.
    const dialog = page.getByRole('dialog', { name: /^Edit Category, / });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('status')).toHaveCount(1);
    await expect(busy(dialog)).toHaveCount(1);
    await expect(dialog.getByRole('textbox')).toHaveCount(0);
    await expect(page).toHaveURL(/\/admin\/categories$/);
    await assertNoAccessibilityViolations(page);
    const element = await dialog.elementHandle();

    await gate.release();

    await expect(page).toHaveURL(/\/admin\/categories\?edit=/);
    await expect(dialog.getByRole('textbox', { name: 'Name' })).toBeFocused();
    // No longer busy; not 'no status', since a form's combobox holds one of its own.
    await expect(busy(dialog)).toHaveCount(0);
    // The dialog the press opened is the one the form arrived in.
    expect(await element?.evaluate((node) => node.isConnected && node.hasAttribute('open'))).toBe(
      true,
    );
  },
);

test(
  'an admin’s Add opens the compendium’s modal before its page arrives',
  { tag: '@story-18' },
  async ({ page }) => {
    await signInAs(page, 'add@admin-modal-loading.test', ['discord'], 'admin');
    await page.goto('/admin/compendium');
    const gate = await holdModalRequests(page, '/admin/compendium', 'new');

    await page.getByRole('link', { name: 'Add Ingredient' }).click();

    const dialog = page.getByRole('dialog', { name: 'Add Ingredient' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('status')).toHaveCount(1);
    await expect(busy(dialog)).toHaveCount(1);
    await expect(page).toHaveURL(/\/admin\/compendium$/);

    await gate.release();

    await expect(page).toHaveURL(/\/admin\/compendium\?new$/);
    await expect(dialog.getByRole('textbox', { name: 'Name', exact: true })).toBeVisible();
    // No longer busy; not 'no status', since a form's combobox holds one of its own.
    await expect(busy(dialog)).toHaveCount(0);
  },
);

test('an admin who closes a loading modal finds it closed once its page arrives', async ({
  page,
}) => {
  await signInAs(page, 'close@admin-modal-loading.test', ['discord'], 'admin');
  await page.goto('/admin/categories');
  const gate = await holdModalRequests(page, '/admin/categories', 'new');

  await page.getByRole('link', { name: 'Add Category' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add Category' });
  await expect(dialog.getByRole('status')).toHaveCount(1);

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await gate.release();

  // The held navigation has landed and been discarded: no modal, no `?new`.
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/admin\/categories$/);
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(26);
});
