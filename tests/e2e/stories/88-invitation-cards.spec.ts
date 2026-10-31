import { readFile } from 'node:fs/promises';
import { test, expect } from '../fixtures';
import { decodePdfLinks, defaultExpiry } from '../cards';
import { recreateE2eDatabase } from '../database';
import { signInAgainAs, signInAs } from '../session';

// Story 88: an admin mints a batch of cards, and a brand-new account opens a card's link and may then start a coven. The
// QR image is decoded rather than looked at: its content must be the link a person scanning it opens.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

test.describe('Story 88: A Card Invites a Stranger In', { tag: '@story-88' }, () => {
  test('an admin mints two cards and a stranger scans one and can start a coven', async ({
    page,
    baseURL,
  }) => {
    const origin = new URL(baseURL ?? '').origin;
    const { userId: adminId } = await signInAs(
      page,
      'cards-admin@story-88.test',
      ['discord'],
      'admin',
    );
    const links: string[] = [];

    await test.step('the admin mints a sheet of nine, downloads the PDF and sees one batch', async () => {
      await page.goto('/admin/invitation-cards');
      await page.getByRole('link', { name: 'Mint Cards' }).click();
      const dialog = page.getByRole('dialog', { name: 'Mint Cards' });
      await dialog.getByRole('spinbutton', { name: 'Number of Sheets' }).fill('1');
      await dialog.getByRole('button', { name: 'Mint Cards' }).click();
      await expect(dialog.getByText(/9 cards on 1 sheet/)).toBeVisible();

      const pdfDownload = page.waitForEvent('download');
      await dialog.getByRole('button', { name: 'Download PDF' }).click();
      const pdf = await pdfDownload;
      expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
      const path = test.info().outputPath('cards.pdf');
      await pdf.saveAs(path);
      expect((await readFile(path)).subarray(0, 5).toString('latin1')).toBe('%PDF-');

      await dialog.getByRole('button', { name: 'Done' }).click();
      await expect(dialog).toBeHidden();
      const batch = page
        .getByRole('row')
        .filter({ has: page.getByRole('button', { name: /^Revoke Batch / }) });
      await expect(batch).toHaveCount(1);
      // The day on screen is the day printed on the card: UTC, en-GB.
      await expect(batch).toContainText(defaultExpiry());

      const printed = await decodePdfLinks(page, path);
      expect(printed, 'the nine codes on the sheet decode').toHaveLength(9);
      for (const link of printed) {
        // The short form, on this site: the token is the last path segment.
        expect(link).toMatch(
          new RegExp(`^${origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/i/[\\w-]{12,}$`),
        );
      }
      expect(new Set(printed).size).toBe(9);
      links.push(...printed);
    });

    await test.step('an unverified account opening the other card is sent to confirm its email', async () => {
      await signInAs(page, 'unverified@story-88.test', ['discord'], 'user', {
        emailVerified: false,
      });
      await page.goto(links[1]);
      await expect(page.getByText(/email address isn't confirmed yet/)).toBeVisible();
      await page.getByRole('link', { name: 'Confirm Your Email' }).click();
      await expect(page).toHaveURL(/\/account\/email/);
    });

    await test.step('a fresh verified account accepts the first card and can create a coven', async () => {
      await signInAs(page, 'stranger@story-88.test');
      await page.goto(links[0]);
      await page.getByRole('button', { name: 'Accept Invitation' }).click();
      await expect(page).toHaveURL(/\/coven\/new$/);
      await expect(page.getByRole('heading', { level: 1, name: 'Create Coven' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Create Coven' })).toBeVisible();
    });

    await test.step('the same link a second time is refused as already used', async () => {
      await page.goto(links[0]);
      await expect(page.getByText('This invitation has already been accepted.')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Accept Invitation' })).toHaveCount(0);
    });

    await test.step('the batch counts one accepted, and the admin revokes the rest', async () => {
      await signInAgainAs(page, adminId);
      await page.goto('/admin/invitation-cards');
      const batch = page
        .getByRole('row')
        .filter({ has: page.getByRole('button', { name: /^Revoke Batch / }) });
      await expect(batch).toContainText('9');
      await expect(batch).toContainText('1');
      await page.getByRole('button', { name: /^Revoke Batch / }).click();
      await page
        .getByRole('dialog', { name: 'Revoke Batch' })
        .getByRole('button', { name: 'Revoke Batch' })
        .click();
      await expect(page.getByRole('button', { name: /^Revoke Batch / })).toHaveCount(0);

      await page.goto('/admin/card-sign-ups');
      await expect(page.getByRole('row').filter({ hasText: 'Fixture Person' })).toHaveCount(1);
    });

    await test.step('the revoked card’s link is refused as withdrawn', async () => {
      await signInAs(page, 'latecomer@story-88.test');
      await page.goto(links[1]);
      await expect(page.getByText(/This invitation was withdrawn/)).toBeVisible();
    });
  });
});
