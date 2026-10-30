import jsQR from 'jsqr';
import type { Locator } from '@playwright/test';

/** The 15th of next month (UTC), as the calendar names it and the cards list prints it: "15 November 2026". */
export function nextMonthsFifteenth(now = new Date()): string {
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 15));
  return day.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Sets Expires On in the Mint Cards dialog by walking its calendar to next month's 15th; returns that day in words. */
export async function pickExpiry(dialog: Locator): Promise<string> {
  const words = nextMonthsFifteenth();
  await dialog.getByRole('button', { name: /Expires On/ }).click();
  const page = dialog.page();
  await page.getByRole('button', { name: /Next Month/ }).click();
  await page
    .getByRole('grid')
    .getByRole('button', { name: new RegExp(`, ${words}`) })
    .click();
  return words;
}

/**
 * Reads the code back as a phone camera sees it: the picture drawn on a dark ground with a margin, a few pixels to a
 * module. Its round dots stand apart, and the decoder only joins them into a grid at small scales, so it tries a few.
 */
export async function decodeQr(image: Locator): Promise<string | null> {
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
