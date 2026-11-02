import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';

// Accessibility of the support screens, and the error pages' route into the form. The send-and-reply
// flow is story 89's.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('/support has no accessibility violations signed out and signed in', async ({ page }) => {
  await page.goto('/support');
  await expect(page.getByRole('link', { name: 'Sign In' }).first()).toBeVisible();
  await assertNoAccessibilityViolations(page);

  await signInAs(page, 'sender@support-pages.test');
  await page.goto('/support');
  await expect(page.getByRole('button', { name: 'Send' })).toBeVisible();
  await assertNoAccessibilityViolations(page);
});

test('/account/support has no accessibility violations', async ({ page }) => {
  await signInAs(page, 'lister@support-pages.test');
  await page.goto('/account/support');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await assertNoAccessibilityViolations(page);
});

test('the open Support dialog has no accessibility violations', async ({ page }) => {
  await signInAs(page, 'dialog@support-pages.test');
  await page.goto('/account?support=bug');
  await expect(page.getByRole('dialog')).toBeVisible();
  await assertNoAccessibilityViolations(page);
});

test('Report This on a 404 opens the form for a bug about that error', async ({ page }) => {
  await signInAs(page, 'reporter@support-pages.test');
  await page.goto('/coven/no-such-coven');
  await page.getByRole('link', { name: /report/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page).toHaveURL(/support=bug/);
  await expect(page).toHaveURL(/error=404/);
});

test('the footer Support link opens the dialog over the page the visitor is on', async ({
  page,
}) => {
  await signInAs(page, 'footer@support-pages.test');
  await page.goto('/account');
  await page.getByRole('contentinfo').getByRole('link', { name: 'Support' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page).toHaveURL(/\/account\?support=/);
});
