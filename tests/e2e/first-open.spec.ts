import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import { slotUrl } from './slots';
import { seedCoven, type Coven } from './stories/coven-ingredients';

// Quick Look and Add Ingredient load their code on first open, not with the page. Each is opened once on a
// settled page: the browser fetches a script it had not, and the dialog then works
// (claude-docs/components/modal.md).

const COVEN = 'Fixture Coven First Open';
let coven: Coven;

test.beforeAll(async ({ browser, slot }) => {
  await recreateE2eDatabase();
  const setup = await browser.newPage({ baseURL: slotUrl(slot) });
  try {
    coven = await seedCoven(setup, COVEN, 'first-open.test', { A: 'owner' });
  } finally {
    await setup.close();
  }
});

test.beforeEach(async ({ page }) => {
  await signInAgainAs(page, coven.users.A);
});

/** Every script the page asks for from now on. */
function scriptsFrom(page: Page): string[] {
  const asked: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'script') asked.push(request.url());
  });
  return asked;
}

/** The page loaded and quiet: hydrated, and done fetching what it fetches by itself. */
async function settled(page: Page, path: string): Promise<string[]> {
  const asked = scriptsFrom(page);
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  // Only what the opening asks for counts.
  asked.length = 0;
  return asked;
}

test('Quick Look loads its code on first open, and opens over the list', async ({ page }) => {
  const asked = await settled(page, '/compendium');
  const eye = page.getByRole('link', { name: /^Quick Look / }).first();
  await expect(eye).toBeVisible();

  await eye.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'See in Compendium' })).toBeVisible();
  expect(asked.length).toBeGreaterThan(0);

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(eye).toBeFocused();
});

test('Add Ingredient loads its code on first open, its form ready for a name', async ({ page }) => {
  const asked = await settled(page, `/coven/${coven.slug}/ingredients`);
  const add = page.getByRole('banner').getByRole('button', { name: 'Add Ingredient' });
  await expect(add).toBeVisible();

  await add.click();

  const dialog = page.getByRole('dialog', { name: `Add Ingredient to ${COVEN}` });
  await expect(dialog).toBeVisible();
  const name = dialog.getByRole('textbox', { name: 'Name' }).first();
  await expect(name).toBeFocused();
  await expect(name).toBeEditable();
  expect(asked.length).toBeGreaterThan(0);

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});
