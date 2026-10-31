import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { decodePdfLinks } from './cards';
import { recreateE2eDatabase } from './database';
import { signInAs } from './session';

// The Invitation Cards and Card Sign-Ups tabs against the built server: a sheet of cards minted through the form,
// downloaded as a PDF and listed as one batch, free of accessibility violations. Who may mint is tests/modules/identity's.
test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test('an admin mints a sheet of cards and the Invitation Cards tab lists the batch without violations', async ({
  page,
}) => {
  await signInAs(page, 'cards-admin@admin-cards.test', ['discord'], 'admin');
  await page.goto('/admin/invitation-cards');

  await page.getByRole('link', { name: 'Mint Cards' }).click();
  const dialog = page.getByRole('dialog', { name: 'Mint Cards' });
  await dialog.getByRole('spinbutton', { name: 'Number of Sheets' }).fill('1');
  await expect(dialog.getByText('9 cards', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Mint Cards' }).click();
  await expect(dialog.getByText(/9 cards minted/)).toBeVisible();

  // Closing before the download asks first, and keeping the dialog open leaves the PDF on offer.
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(dialog.getByText(/You haven't downloaded the PDF/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Keep Open' }).click();
  await expect(dialog.getByRole('button', { name: 'Download PDF' })).toBeVisible();

  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download PDF' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
  await dialog.getByRole('button', { name: 'Done' }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: /^Revoke Batch / })).toHaveCount(1);
  await assertNoAccessibilityViolations(page);

  // A filter applied from the Filters drawer: the URL holds it and the page has no violations with it on.
  await page.getByRole('button', { name: /^Filters/ }).click();
  const drawer = page.getByRole('dialog', { name: 'Filters' });
  await expect(drawer).toBeVisible();
  const status = drawer.getByRole('group', { name: 'Status' });
  await status.locator('summary').click();
  // The native radio is drawn invisible, so its label takes the click.
  await status
    .getByRole('radio', { name: 'Live' })
    .locator('xpath=ancestor::label[1]')
    .click({ position: { x: 10, y: 10 } });
  await assertNoAccessibilityViolations(page);
  await drawer.getByRole('button', { name: 'Apply Filters' }).click();
  await expect(page).toHaveURL(/status=live/);
  await expect(page.getByRole('button', { name: /^Filters\D*1/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Revoke Batch / })).toHaveCount(1);
  await assertNoAccessibilityViolations(page);

  await page.goto('/admin/card-sign-ups');
  await expect(page.getByText('No one has accepted a card yet.')).toBeVisible();
  await assertNoAccessibilityViolations(page);

  // With no filter the download still works and is named for the tab.
  const csv = page.waitForEvent('download');
  await page.getByRole('button', { name: /Download CSV/ }).click();
  expect((await csv).suggestedFilename()).toBe('card-sign-ups.csv');

  await page.getByRole('searchbox', { name: 'Name, Email or Batch' }).fill('nobody');
  await page.getByRole('searchbox', { name: 'Name, Email or Batch' }).press('Enter');
  await expect(page).toHaveURL(/query=nobody/);
  await expect(page.getByText(/No sign-ups match/)).toBeVisible();
  await assertNoAccessibilityViolations(page);
});

test('an admin revokes a whole batch and its links are refused as withdrawn', async ({
  page,
}, testInfo) => {
  await signInAs(page, 'cards-admin@admin-cards.test', ['discord'], 'admin');
  await page.goto('/admin/invitation-cards');
  const before = await page.getByRole('button', { name: /^Revoke Batch / }).count();

  await page.getByRole('link', { name: 'Mint Cards' }).click();
  const dialog = page.getByRole('dialog', { name: 'Mint Cards' });
  await dialog.getByRole('spinbutton', { name: 'Number of Sheets' }).fill('1');
  await dialog.getByRole('button', { name: 'Mint Cards' }).click();
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download PDF' }).click();
  const path = testInfo.outputPath('cards.pdf');
  await (await download).saveAs(path);
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: /^Revoke Batch / })).toHaveCount(before + 1);

  const links = await decodePdfLinks(page, path);
  expect(links, 'every code on the sheet decodes').toHaveLength(9);
  await page.goto('/admin/invitation-cards');

  // The newest batch is the first row.
  await page
    .getByRole('button', { name: /^Revoke Batch / })
    .first()
    .click();
  await page
    .getByRole('dialog', { name: 'Revoke Batch' })
    .getByRole('button', { name: 'Revoke Batch' })
    .click();
  await expect(page.getByRole('button', { name: /^Revoke Batch / })).toHaveCount(before);

  await signInAs(page, 'latecomer@admin-cards.test');
  await page.goto(links[0]!);
  await expect(page.getByText(/This card has been withdrawn/)).toBeVisible();
});
