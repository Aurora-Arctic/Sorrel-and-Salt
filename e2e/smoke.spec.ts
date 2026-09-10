import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';

// playwright.config.ts's `fullyParallel: true` lets Playwright split this
// file's tests across multiple workers — without `serial` mode, `beforeAll`
// below runs once per worker that picks up a test from this file, and two
// workers racing DROP/CREATE DATABASE on `sorrel_e2e` throws
// `duplicate key value violates unique constraint "pg_database_datname_index"`.
// `serial` keeps every test in this file on one worker, so the reset really
// does happen once, matching DESIGN.md's "reseeded between spec files" (not
// between tests within a file). Every db-touching spec file needs this.
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
