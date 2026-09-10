import { test, expect } from '@playwright/test';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';

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
