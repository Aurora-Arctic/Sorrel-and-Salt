import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';

// Against the built server: the headers arrive, and the policy blocks nothing the pages need. Chromium
// logs a refused load to the console and fires `securitypolicyviolation`; both are collected.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

async function collectViolations(page: Page): Promise<string[]> {
  const violations: string[] = [];
  page.on('console', (message) => {
    if (/content security policy/i.test(message.text())) violations.push(message.text());
  });
  await page.exposeFunction('reportViolation', (text: string) => violations.push(text));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      const { violatedDirective, blockedURI, sourceFile, lineNumber } = event;
      void (window as unknown as { reportViolation: (text: string) => void }).reportViolation(
        `${violatedDirective} ${blockedURI} ${sourceFile}:${lineNumber}`,
      );
    });
  });
  return violations;
}

test('a page answers with the policy, nosniff and a referrer policy', async ({ page }) => {
  const response = await page.goto('/compendium');
  const headers = response?.headers() ?? {};

  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
});

test('the home page and the compendium load under the policy with no violation', async ({
  page,
}) => {
  const violations = await collectViolations(page);

  await page.goto('/');
  await page.goto('/compendium');
  await expect(page.getByRole('navigation', { name: 'Site' })).toBeVisible();
  // The pre-paint scripts are inline: this one sets `data-js` on <html> only if it ran.
  await expect(page.locator('html[data-js]')).toHaveCount(1);

  expect(violations).toEqual([]);
});

test('a signed-in page loads under the policy with no violation', async ({ page }) => {
  await signInAs(page, 'headers@security-headers.test');
  const violations = await collectViolations(page);

  await page.goto('/account');
  await expect(page.getByRole('main')).toBeVisible();
  await page.waitForLoadState('networkidle');

  expect(violations).toEqual([]);
});
