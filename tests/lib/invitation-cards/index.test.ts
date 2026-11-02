import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCardSheetsPdf } from '@/lib/invitation-cards';

const PUBLIC = path.join(process.cwd(), 'public');

describe('buildCardSheetsPdf', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('fetches the card fonts and pictures from the public folder and builds the sheets', async () => {
    const fetched: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      fetched.push(url);
      return new Response(readFileSync(path.join(PUBLIC, url)));
    });
    const bytes = await buildCardSheetsPdf({
      links: ['https://sorrelandsalt.com/i/a', 'https://sorrelandsalt.com/i/b'],
      batch: 'b4444444',
      expiresAt: new Date('2027-03-31'),
    });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2);
    expect(fetched).toHaveLength(6);
  });

  it('refuses when a file is missing, rather than printing without it', async () => {
    vi.stubGlobal('fetch', async () => new Response(null, { status: 404 }));
    await expect(
      buildCardSheetsPdf({
        links: ['https://sorrelandsalt.com/i/a'],
        batch: 'b4444444',
        expiresAt: new Date('2027-03-31'),
      }),
    ).rejects.toThrow('Could not load');
  });
});
