import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Page } from '@playwright/test';

/** The day Expires On opens on, 90 days from today (UTC), as the cards list prints it: "28 January 2027". */
export function defaultExpiry(now = new Date()): string {
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 90));
  return day.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** The same day as `defaultExpiry`, as the batch table's Expires column prints it: "2027-01-28". */
export function defaultExpiryDay(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 90))
    .toISOString()
    .slice(0, 10);
}

/**
 * Reads every code on the PDF's first page as a phone camera sees it: the page drawn by pdf.js in the browser, then
 * decoded with jsQR, blanking each code found so the next can be read. The two libraries are served from node_modules
 * to the page under test; the code is drawn as round dots, so the page is drawn large enough for them to join.
 */
export async function decodePdfLinks(page: Page, pdfPath: string): Promise<string[]> {
  const root = join(process.cwd(), 'node_modules');
  const files: Record<string, [string, string]> = {
    '/__e2e/pdf.mjs': [join(root, 'pdfjs-dist/build/pdf.mjs'), 'text/javascript'],
    '/__e2e/pdf.worker.mjs': [join(root, 'pdfjs-dist/build/pdf.worker.mjs'), 'text/javascript'],
    '/__e2e/jsQR.js': [join(root, 'jsqr/dist/jsQR.js'), 'text/javascript'],
  };
  await page.route('**/__e2e/*', async (route) => {
    const entry = files[new URL(route.request().url()).pathname];
    if (!entry) return route.fallback();
    return route.fulfill({ body: await readFile(entry[0]), contentType: entry[1] });
  });
  await page.goto('/__e2e/blank');
  await page.addScriptTag({ url: '/__e2e/jsQR.js' });
  const bytes = Array.from(await readFile(pdfPath));
  return page.evaluate(async (data) => {
    const load = new Function('url', 'return import(url)') as (
      url: string,
    ) => Promise<typeof import('pdfjs-dist')>;
    const pdfjs = await load('/__e2e/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = '/__e2e/pdf.worker.mjs';
    const pdf = await pdfjs.getDocument({ data: Uint8Array.from(data) }).promise;
    const sheet = await pdf.getPage(1);
    const decode = (window as unknown as { jsQR: unknown }).jsQR as (
      data: Uint8ClampedArray,
      width: number,
      height: number,
    ) => {
      data: string;
      location: Record<
        'topLeftCorner' | 'topRightCorner' | 'bottomLeftCorner' | 'bottomRightCorner',
        { x: number; y: number }
      >;
    } | null;
    const links: string[] = [];
    // Each card's code sits at a fixed place in the three-by-three block (points from the page's top left). The round
    // dots stand apart when drawn large and join into a grid at a few pixels to a module, so a few scales are tried,
    // and each code is cropped onto a dark ground with a margin, as a phone camera sees it.
    const centresX = [117, 304, 494];
    const centresY = [205, 458, 707];
    for (const scale of [1.3, 1, 1.7, 2.2]) {
      const viewport = sheet.getViewport({ scale });
      const page = document.createElement('canvas');
      page.width = Math.ceil(viewport.width);
      page.height = Math.ceil(viewport.height);
      const pageContext = page.getContext('2d');
      if (!pageContext) throw new Error('no canvas');
      await sheet.render({ canvasContext: pageContext, canvas: page, viewport }).promise;
      const half = 48 * scale;
      const side = Math.ceil(2 * half + 24);
      for (const y of centresY) {
        for (const x of centresX) {
          const crop = document.createElement('canvas');
          crop.width = side;
          crop.height = side;
          const context = crop.getContext('2d');
          if (!context) throw new Error('no canvas');
          context.fillStyle = '#1c1a17';
          context.fillRect(0, 0, side, side);
          context.drawImage(
            page,
            x * scale - half,
            y * scale - half,
            2 * half,
            2 * half,
            12,
            12,
            2 * half,
            2 * half,
          );
          const image = context.getImageData(0, 0, side, side);
          const found = decode(image.data, side, side);
          if (found && !links.includes(found.data)) links.push(found.data);
        }
      }
      if (links.length >= 9) break;
    }
    return links;
  }, bytes);
}
