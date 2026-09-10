import { test, expect } from '@playwright/test';
import { assertNoAccessibilityViolations } from './axe';

test('a seeded violation fails the scan', async ({ page }) => {
  await page.setContent('<html><body><img src="x.png"></body></html>');
  await expect(assertNoAccessibilityViolations(page)).rejects.toThrow();
});
