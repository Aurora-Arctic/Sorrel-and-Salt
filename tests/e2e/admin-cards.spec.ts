import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { decodeQr, pickExpiry } from './cards';
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
  await pickExpiry(dialog);
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

test('an admin revokes a whole batch and its links are refused as withdrawn', async ({ page }) => {
  await signInAs(page, 'cards-admin@admin-cards.test', ['discord'], 'admin');
  await page.goto('/admin/cards');

  await page.getByRole('link', { name: 'Mint Cards' }).click();
  const dialog = page.getByRole('dialog', { name: 'Mint Cards' });
  await dialog.getByLabel(/Number of Cards/).fill('2');
  await pickExpiry(dialog);
  await dialog.getByRole('button', { name: 'Mint Cards' }).click();
  await expect(dialog.getByText(/cannot be shown again/)).toBeVisible();
  const link = await decodeQr(dialog.getByRole('img', { name: 'Code for Card 1' }));
  expect(link, 'the first code decodes').not.toBeNull();
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(dialog).toBeHidden();

  await page
    .getByRole('listitem')
    .filter({ hasText: '2 pending' })
    .getByRole('button', { name: /^Revoke Batch / })
    .click();
  await page
    .getByRole('dialog', { name: 'Revoke Batch' })
    .getByRole('button', { name: 'Revoke Batch' })
    .click();
  await expect(page.getByRole('row', { name: /^Revoked / })).toHaveCount(2);

  await signInAs(page, 'latecomer@admin-cards.test');
  await page.goto(link as string);
  await expect(page.getByText(/This invitation was withdrawn/)).toBeVisible();

  // The refused open was recorded, so the Cards tab counts it and lists who tried and why.
  await signInAs(page, 'cards-admin@admin-cards.test', ['discord'], 'admin');
  await page.goto('/admin/cards');
  const attempted = page
    .getByRole('row')
    .filter({ has: page.getByRole('button', { name: /^View Attempts/ }) });
  await expect(attempted).toHaveCount(1);
  await attempted.getByRole('button', { name: /^View Attempts/ }).click();
  const attempts = page.getByRole('dialog', { name: 'Refused Opens' });
  await expect(attempts.getByRole('row').filter({ hasText: 'Revoked' })).toHaveCount(1);
  await assertNoAccessibilityViolations(page);
});
