import { describe, expect, it } from 'vitest';
import { pageLoop } from '@/lib/jobs/page-loop';

describe('pageLoop', () => {
  it('starts a batch per page, advancing the cursor, and stops on a short page', async () => {
    const pages: Record<string, string[]> = { start: ['a', 'b'], b: ['c', 'd'], d: ['e'] };
    const cursors: (string | null)[] = [];
    const started: string[][] = [];
    const count = await pageLoop(
      2,
      async (after) => {
        cursors.push(after);
        return pages[after ?? 'start'] ?? [];
      },
      async (ids) => void started.push(ids),
    );
    expect(count).toBe(3);
    expect(cursors).toEqual([null, 'b', 'd']);
    expect(started).toEqual([['a', 'b'], ['c', 'd'], ['e']]);
  });

  it('starts nothing when the first page is empty', async () => {
    const count = await pageLoop(
      2,
      async () => [],
      async () => {
        throw new Error('no batch');
      },
    );
    expect(count).toBe(0);
  });
});
