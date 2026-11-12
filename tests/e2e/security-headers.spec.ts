import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';
import { hydrated } from './waits';

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

test('the home page and the compendium load under the policy with no violation', async ({
  page,
}) => {
  const violations = await collectViolations(page);

  // A late resource's violation only shows once the page has loaded and hydrated, so each page is waited on for both.
  for (const path of ['/', '/compendium']) {
    await page.goto(path, { waitUntil: 'load' });
    await hydrated(page, 'main');
  }
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
  await hydrated(page, 'main');

  expect(violations).toEqual([]);
});
