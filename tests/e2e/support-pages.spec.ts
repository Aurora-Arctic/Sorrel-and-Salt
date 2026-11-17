import { test, expect } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';

// The error pages' route into the support form. The send-and-reply flow is story 89's.

test.beforeAll(async () => {
  await recreateE2eDatabase();
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
