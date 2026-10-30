import { readFile } from 'node:fs/promises';
import jsQR from 'jsqr';
import type { Locator } from '@playwright/test';
import { test, expect } from '../fixtures';
import { recreateE2eDatabase } from '../database';
import { signInAgainAs, signInAs } from '../session';

// Story 88: an admin mints a batch of cards, and a brand-new account opens a card's link and may then start a coven. The
// QR image is decoded rather than looked at: its content must be the link a person scanning it opens.

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

/**
 * Reads the code back as a phone camera sees it: the picture drawn on a dark ground with a margin, a few pixels to a
 * module. Its round dots stand apart, and the decoder only joins them into a grid at small scales, so it tries a few.
 */
async function decodeQr(image: Locator): Promise<string | null> {
  const attempts = await image.evaluate(async (element) => {
    const img = element as HTMLImageElement;
    await img.decode();
    const svg = decodeURIComponent(img.src.slice(img.src.indexOf(',') + 1));
    const modules = Number(/viewBox="0 0 (\d+) /.exec(svg)?.[1]);
    return [3, 2, 5].map((scale) => {
      const margin = 4 * scale;
      const side = modules * scale + 2 * margin;
      const canvas = document.createElement('canvas');
      canvas.width = side;
      canvas.height = side;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('no canvas');
      context.fillStyle = '#1c1a17';
      context.fillRect(0, 0, side, side);
      context.drawImage(img, margin, margin, modules * scale, modules * scale);
      return { side, data: Array.from(context.getImageData(0, 0, side, side).data) };
    });
  });
  for (const { side, data } of attempts) {
    const found = jsQR(Uint8ClampedArray.from(data), side, side);
    if (found) return found.data;
  }
  return null;
}

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

    await test.step('the admin mints a batch of two, downloads a code and the PDF, and sees two pending', async () => {
      await page.goto('/admin/cards');
      await page.getByRole('link', { name: 'Mint Cards' }).click();
      const dialog = page.getByRole('dialog', { name: 'Mint Cards' });
      await dialog.getByLabel(/Number of Cards/).fill('2');
      await dialog.getByLabel(/Expires On/).fill('2099-01-01');
      await dialog.getByRole('button', { name: 'Mint Cards' }).click();
      await expect(dialog.getByText(/cannot be shown again/)).toBeVisible();

      for (const n of [1, 2]) {
        const link = await decodeQr(dialog.getByRole('img', { name: `Code for Card ${n}` }));
        expect(link, `card ${n}'s code decodes`).not.toBeNull();
        // The short form, on this site: the token is the last path segment.
        expect(link).toMatch(
          new RegExp(`^${origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/i/[\\w-]{12,}$`),
        );
        links.push(link as string);
      }
      expect(links[0]).not.toBe(links[1]);

      const svgDownload = page.waitForEvent('download');
      await dialog.getByRole('button', { name: 'Download Card 1' }).click();
      expect((await svgDownload).suggestedFilename()).toMatch(/\.svg$/);

      const pdfDownload = page.waitForEvent('download');
      await dialog.getByRole('button', { name: 'Download PDF' }).click();
      const pdf = await pdfDownload;
      expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
      const path = test.info().outputPath('cards.pdf');
      await pdf.saveAs(path);
      expect((await readFile(path)).subarray(0, 5).toString('latin1')).toBe('%PDF-');

      await dialog.getByRole('button', { name: 'Done' }).click();
      await expect(dialog).toBeHidden();
      const pending = page.getByRole('row', { name: /^Pending / });
      await expect(pending).toHaveCount(2);
      // The day on screen is the day printed on the card: UTC, en-GB.
      await expect(pending.first()).toContainText('1 January 2099');
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

    await test.step('the list shows the card accepted with the account, and the admin revokes the other', async () => {
      await signInAgainAs(page, adminId);
      await page.goto('/admin/cards');
      await expect(page.getByRole('row', { name: /^Accepted / })).toContainText('Fixture Person');
      await page.getByRole('button', { name: /^Revoke card / }).click();
      await page
        .getByRole('dialog', { name: 'Revoke Card' })
        .getByRole('button', { name: 'Revoke', exact: true })
        .click();
      await expect(page.getByRole('row', { name: /^Revoked / })).toHaveCount(1);

      await page.goto('/admin/arrivals');
      await expect(page.getByRole('row').filter({ hasText: 'Fixture Person' })).toHaveCount(1);
    });

    await test.step('the revoked card’s link is refused as withdrawn', async () => {
      await signInAs(page, 'latecomer@story-88.test');
      await page.goto(links[1]);
      await expect(page.getByText(/This invitation was withdrawn/)).toBeVisible();
    });
  });
});
