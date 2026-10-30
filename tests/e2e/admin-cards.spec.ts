import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';

// The Cards and Arrivals tabs against the built server: a batch minted through the form, listed, and free of
// accessibility violations with the batch showing. Who may mint is tests/modules/identity's.
test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('an admin mints a batch of cards and the Cards tab lists it without violations', async ({
  page,
}) => {
  await signInAs(page, 'cards-admin@admin-cards.test', ['discord'], 'admin');
  await page.goto('/admin/cards');

  await page.getByRole('link', { name: 'Mint Cards' }).click();
  const dialog = page.getByRole('dialog', { name: 'Mint Cards' });
  await dialog.getByLabel(/Number of Cards/).fill('3');
  await dialog.getByLabel(/Expires On/).fill('2099-01-01');
  await dialog.getByRole('button', { name: 'Mint Cards' }).click();
  await expect(dialog.getByText(/cannot be shown again/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Done' }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByRole('row').filter({ hasText: 'Pending' })).toHaveCount(3);
  await assertNoAccessibilityViolations(page);

  await page.goto('/admin/arrivals');
  await expect(page.getByText('No one has accepted a card yet.')).toBeVisible();
  await assertNoAccessibilityViolations(page);
});
