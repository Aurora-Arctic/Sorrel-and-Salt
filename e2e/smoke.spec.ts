import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';

// `fullyParallel` would split this file across workers and run `beforeAll`
// once per worker, racing DROP/CREATE on `sorrel_e2e`. Every db-touching spec
// file needs this.
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('home page renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sorrel & Salt' })).toBeVisible();
});

test('home page has no accessibility violations', async ({ page }) => {
  await page.goto('/');
  await assertNoAccessibilityViolations(page);
});
