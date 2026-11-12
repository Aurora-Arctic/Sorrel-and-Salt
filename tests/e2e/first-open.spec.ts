import type { Page, Request } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import { slotUrl } from './slots';
import { seedCoven, type Coven } from './stories/coven-ingredients';
import { hydrated } from './waits';

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

/** Every script the page asks for from now on, and how many requests of any kind are still in flight. */
function requestsFrom(page: Page): { asked: string[]; inFlight: Set<Request> } {
  const asked: string[] = [];
  const inFlight = new Set<Request>();
  page.on('request', (request) => {
    inFlight.add(request);
    if (request.resourceType() === 'script') asked.push(request.url());
  });
  page.on('requestfinished', (request) => inFlight.delete(request));
  page.on('requestfailed', (request) => inFlight.delete(request));
  return { asked, inFlight };
}

/** The page loaded and quiet: hydrated, and with no request in flight once the browser has had an idle moment to start its own prefetches. */
async function settled(page: Page, path: string, control: string): Promise<string[]> {
  const { asked, inFlight } = requestsFrom(page);
  await page.goto(path);
  await hydrated(page, control);
  // Idle prefetches start in the browser's first idle moment; any not yet started would land in `asked` after the reset below.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        'requestIdleCallback' in window ? window.requestIdleCallback(() => resolve()) : resolve(),
      ),
  );
  await expect.poll(() => inFlight.size, 'no request is still in flight').toBe(0);
  // Only what the opening asks for counts.
  asked.length = 0;
  return asked;
}

test('Quick Look loads its code on first open, and opens over the list', async ({ page }) => {
  const asked = await settled(page, '/compendium', 'a[href^="/compendium/ingredients/"]');
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
  const asked = await settled(page, `/coven/${coven.slug}/ingredients`, 'header button');
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
