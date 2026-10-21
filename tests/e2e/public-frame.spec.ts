import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';

// The chrome round the public compendium (MB.83), against the built server.
// Story 63 walks a visitor in and on to Sign In; this proves what no story
// walks: the chrome is in the HTML with no script, a signed-in request gets
// the shell from the same layout, every response is marked noindex off
// production, and the signed-out page holds at a phone's width.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test.describe('without script', () => {
  test.use({ javaScriptEnabled: false });

  test('the signed-out chrome is in the HTML as served', async ({ page }) => {
    await page.goto('/compendium');

    await expect(page.getByRole('banner').getByRole('link', { name: 'Sign In' })).toHaveAttribute(
      'href',
      '/sign-in',
    );
    await expect(page.getByRole('link', { name: 'Skip to Content' })).toHaveAttribute(
      'href',
      '#main',
    );
    await expect(page.getByRole('navigation', { name: 'Site' })).toBeVisible();
    // The frame's #main is the skip link's wrapper, as the shell's is (M12.47).
    await expect(page.locator('#main main')).toBeVisible();
  });
});

test('a signed-in request gets the application shell from the same layout', async ({ page }) => {
  await signInAs(page, 'reader@public-frame.test', ['discord']);
  await page.goto('/compendium');

  await expect(page).toHaveURL(/\/compendium$/);
  await expect(page.getByRole('link', { name: 'Sign In' })).toHaveCount(0);
  await expect(
    page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'Compendium' }),
  ).toBeVisible();
  // The shell's #main is the skip link's wrapper; the layout's main sits inside it.
  await expect(page.locator('#main main')).toBeVisible();
});

// The Compendium link is the page you are on, told to a screen reader by aria-current
// (MB.120) in the public bar and in the shell's alike. The visible mark is a rule drawn
// as a border, so it survives forced colours.
const compendiumLink = (page: Page) =>
  page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'Compendium' });

test('the signed-out bar marks the Compendium link as the current page', async ({ page }) => {
  await page.goto('/compendium');

  await expect(compendiumLink(page)).toHaveAttribute('aria-current', 'page');
});

test('the signed-in shell marks the Compendium link as the current page', async ({ page }) => {
  await signInAs(page, 'marked@public-frame.test', ['discord']);
  await page.goto('/compendium');

  await expect(compendiumLink(page)).toHaveAttribute('aria-current', 'page');
});

test('a response off production is marked noindex', async ({ request }) => {
  const response = await request.get('/compendium');

  expect(response.status()).toBe(200);
  expect(response.headers()['x-robots-tag']).toBe('noindex');
});

test('a signed-out visitor is still sent from a coven to sign in', async ({ page }) => {
  await page.goto('/coven/hearth');

  await expect(page).toHaveURL(/\/sign-in/);
});

test('the signed-out page is accessible and holds at 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/compendium');

  await assertNoAccessibilityViolations(page);
  await assertNoSidewaysScroll(page);
});
