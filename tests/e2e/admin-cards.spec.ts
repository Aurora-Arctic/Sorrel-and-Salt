import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations, assertNoSidewaysScroll } from './axe';
import { mintedLinks } from './cards';
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
  // Minting a sheet and drawing its cards runs past the default 30 seconds on CI under coverage.
  test.setTimeout(90_000);
  await signInAs(page, 'cards-admin@admin-cards.test', ['discord'], 'admin');
  await page.goto('/keepers/invitation-cards');

  await page.getByRole('link', { name: 'Mint Cards' }).click();
  const dialog = page.getByRole('dialog', { name: 'Mint Cards' });
  await dialog.getByRole('spinbutton', { name: 'Number of Sheets' }).fill('1');
  await expect(dialog.getByText('10 cards', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Mint Cards' }).click();
  await expect(dialog.getByText(/10 cards minted/)).toBeVisible();

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
  await drawer.getByRole('combobox', { name: 'Status' }).click();
  await page.getByRole('option', { name: 'Live' }).click();
  // The batch was minted today, so the Today pick keeps it; the range's calendar is checked open.
  await drawer.getByRole('button', { name: /^Minted/ }).click();
  const minted = page.getByRole('dialog', { name: 'Choose Minted Days' });
  await expect(minted).toBeVisible();
  await assertNoAccessibilityViolations(page);
  await minted.getByRole('button', { name: 'Today', exact: true }).click();
  await expect(minted).toBeHidden();
  await assertNoAccessibilityViolations(page);
  await drawer.getByRole('button', { name: 'Apply Filters' }).click();
  await expect(page).toHaveURL(
    /status=live&mintedFrom=\d{4}-\d{2}-\d{2}&mintedTo=\d{4}-\d{2}-\d{2}/,
  );
  await expect(page.getByRole('button', { name: /^Filters\D*2/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Revoke Batch / })).toHaveCount(1);
  await assertNoAccessibilityViolations(page);

  await page.goto('/keepers/card-sign-ups');
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

// The phone drawer is a modal sheet, which closes on any Escape its controls leave unclaimed.
test('on a phone, Escape shuts the range calendar and the status list and leaves the Filters sheet open', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInAs(page, 'cards-admin@admin-cards.test', ['discord'], 'admin');
  await page.goto('/keepers/invitation-cards');
  await page.getByRole('button', { name: /^Filters/ }).click();
  const drawer = page.getByRole('dialog', { name: 'Filters' });
  await expect(drawer).toBeVisible();

  await drawer.getByRole('button', { name: /^Expires/ }).click();
  const expires = page.getByRole('dialog', { name: 'Choose Expires Days' });
  await expect(expires.getByRole('grid')).toHaveCount(1);
  await assertNoAccessibilityViolations(page);
  await page.keyboard.press('Escape');
  await expect(expires).toBeHidden();
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('button', { name: /^Expires/ })).toBeFocused();

  await drawer.getByRole('combobox', { name: 'Status' }).click();
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toBeHidden();
  await expect(drawer).toBeVisible();
});

test('an admin revokes a whole batch and its links are refused as withdrawn', async ({
  page,
}, testInfo) => {
  await signInAs(page, 'cards-admin@admin-cards.test', ['discord'], 'admin');
  await page.goto('/keepers/invitation-cards');
  const before = await page.getByRole('button', { name: /^Revoke Batch / }).count();

  await page.getByRole('link', { name: 'Mint Cards' }).click();
  const dialog = page.getByRole('dialog', { name: 'Mint Cards' });
  await dialog.getByRole('spinbutton', { name: 'Number of Sheets' }).fill('1');
  const minted = mintedLinks(page);
  await dialog.getByRole('button', { name: 'Mint Cards' }).click();
  const links = await minted;
  expect(links, 'a sheet of ten links').toHaveLength(10);
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download PDF' }).click();
  const path = testInfo.outputPath('cards.pdf');
  await (await download).saveAs(path);
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: /^Revoke Batch / })).toHaveCount(before + 1);

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

test("a beta card's landing page has no violations, and no sideways scroll on a phone", async ({
  page,
  browser,
}) => {
  await signInAs(page, 'cards-admin@admin-cards.test', ['discord'], 'admin');
  await page.goto('/keepers/invitation-cards');
  await page.getByRole('link', { name: 'Mint Cards' }).click();
  const dialog = page.getByRole('dialog', { name: 'Mint Cards' });
  await dialog.getByRole('spinbutton', { name: 'Number of Sheets' }).fill('1');
  await dialog.getByRole('checkbox', { name: 'Beta Testers' }).check();
  const minted = mintedLinks(page);
  await dialog.getByRole('button', { name: 'Mint Cards' }).click();
  const [link] = await minted;

  // A browser of its own, signed out, as the minted dialog still holds the PDF unsaved here.
  const context = await browser.newContext();
  const visitor = await context.newPage();
  await visitor.goto(link!);
  await expect(visitor.getByRole('heading', { name: 'You’re Among the First' })).toBeVisible();
  await assertNoAccessibilityViolations(visitor);
  await assertNoSidewaysScroll(visitor);
  await assertNoAccessibilityViolations(visitor);
  await context.close();
});
