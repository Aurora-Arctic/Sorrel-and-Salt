import type { Page, Route } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import { seedCoven } from './stories/coven-ingredients';

// The spell builder's save status in each state (saving, saved, failed with Retry, conflict), scanned with
// axe. The autosave itself is stories/06-grimoire.spec.ts's.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

/** Opens the builder on a new spell and types a title; the spell is not saved yet. */
async function startDraft(page: Page, domain: string) {
  const coven = await seedCoven(page, `Fixture Coven ${domain}`, `${domain}.test`, {
    A: 'owner',
    B: 'member',
  });
  await signInAgainAs(page, coven.users.B);
  await page.goto(`/coven/${coven.slug}/grimoire`);
  await page.getByRole('link', { name: 'New Spell' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Title' }).fill('Fixture Working');
  return dialog;
}

/** Answers every save with a GraphQL error carrying `code`, and `extra` in its extensions. */
function refuseSaves(page: Page, code: string, extra: object = {}) {
  return page.route('**/api/graphql', async (route: Route) => {
    const body = route.request().postData() ?? '';
    if (!/mutation (Create|Update)Spell/.test(body)) return route.continue();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: null,
        errors: [{ message: 'Refused', extensions: { code, ...extra } }],
      }),
    });
  });
}

test('the save status is accessible while saving', async ({ page }) => {
  const dialog = await startDraft(page, 'axe-saving');
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route('**/api/graphql', async (route) => {
    if (!/mutation CreateSpell/.test(route.request().postData() ?? '')) return route.continue();
    await held;
    return route.continue();
  });
  await dialog.getByRole('button', { name: 'Save Spell' }).click();
  await expect(dialog.getByText('Saving…')).toBeVisible();
  await assertNoAccessibilityViolations(page);
  release();
  await expect(dialog.getByRole('status').filter({ hasText: /^Draft saved/ })).toBeVisible();
});

test('the save status is accessible once saved', async ({ page }) => {
  const dialog = await startDraft(page, 'axe-saved');
  await dialog.getByRole('button', { name: 'Save Spell' }).click();
  await expect(dialog.getByRole('status').filter({ hasText: /^Draft saved/ })).toBeVisible();
  await assertNoAccessibilityViolations(page);
});

test('the save status is accessible when the save failed, with Retry', async ({ page }) => {
  const dialog = await startDraft(page, 'axe-failed');
  await refuseSaves(page, 'FORBIDDEN');
  await dialog.getByRole('button', { name: 'Save Spell' }).click();
  await expect(dialog.getByText(/Could not save/)).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Retry' })).toBeVisible();
  await assertNoAccessibilityViolations(page);
});

test('the save status is accessible when the spell was changed elsewhere', async ({ page }) => {
  const dialog = await startDraft(page, 'axe-conflict');
  await dialog.getByRole('button', { name: 'Save Spell' }).click();
  await expect(dialog.getByRole('status').filter({ hasText: /^Draft saved/ })).toBeVisible();
  await refuseSaves(page, 'STALE_WRITE', { currentRevision: 99 });
  await dialog.getByRole('textbox', { name: 'Intent' }).fill('Changed again');
  await dialog.getByRole('button', { name: 'Save Spell' }).click();
  await expect(dialog.getByText('This spell was changed elsewhere.')).toBeVisible();
  await assertNoAccessibilityViolations(page);
});
