import { describe, expect, it, vi } from 'vitest';
import { InvalidCursor } from '@/lib/errors';
import { encodeCursor } from '@/lib/pagination';
import { readNumberedPage, readPageCursors } from '@/lib/numbered-page';
import type { PageRequest } from '@/lib/types';

const ID = '0f9c2b1e-6a51-4c3f-9d7e-2b8a4e1c5d60';
const CURSOR = encodeCursor({ key: ['k001'], id: ID });
const OTHER = encodeCursor({ key: ['k002'], id: ID });

describe('readPageCursors', () => {
  it('reads ?after and ?before by default', () => {
    expect(readPageCursors({ after: CURSOR })).toEqual({ after: CURSOR, before: undefined });
    expect(readPageCursors({ before: CURSOR })).toEqual({ after: undefined, before: CURSOR });
  });

  it('reads the keys the caller names and leaves the default ones alone', () => {
    const params = { after: OTHER, before: OTHER, invitedAfter: CURSOR };
    const keys = { after: 'invitedAfter', before: 'invitedBefore' };
    expect(readPageCursors(params, keys)).toEqual({ after: CURSOR, before: undefined });
    expect(readPageCursors({ invitedBefore: CURSOR, after: OTHER }, keys)).toEqual({
      after: undefined,
      before: CURSOR,
    });
  });

  it('reads an address carrying both as the after page, and an unreadable cursor as none', () => {
    expect(readPageCursors({ after: CURSOR, before: OTHER })).toEqual({
      after: CURSOR,
      before: undefined,
    });
    expect(readPageCursors({ after: 'not-a-cursor' })).toEqual({
      after: undefined,
      before: undefined,
    });
  });
});

// The pages that list through readNumberedPage (the admin people tabs, the
// members and invitations pages, the compendium) each prove only that they
// pass their cursor to it; what it does with a cursor of another list is here.
describe('readNumberedPage', () => {
  const ROW = { node: { id: ID }, cursor: { key: ['k001'], id: ID } };
  const count = () => Promise.resolve({ totalCount: 1, countBefore: 0 });

  it('reads the first page again when the cursor is not one of this list', async () => {
    const fetch = vi.fn(async (request: PageRequest) => {
      if (request.after) throw new InvalidCursor();
      return [ROW];
    });

    const page = await readNumberedPage({ after: CURSOR }, fetch, count);

    // Why it could have failed: the address's cursor did reach the finder, which refused it.
    expect(fetch.mock.calls[0][0].after).toBeDefined();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][0].after).toBeUndefined();
    expect(page.edges.map(({ node }) => node.id)).toEqual([ID]);
    expect(page.position).toEqual({ page: 1, pages: 1 });
  });

  it('lets a refused cursor through with no cursor in the address, and any other failure with one', async () => {
    const refused = vi.fn(async () => {
      throw new InvalidCursor();
    });
    await expect(readNumberedPage({}, refused, count)).rejects.toBeInstanceOf(InvalidCursor);
    expect(refused).toHaveBeenCalledTimes(1);

    const broken = new Error('connection lost');
    const failing = vi.fn(async () => {
      throw broken;
    });
    await expect(readNumberedPage({ after: CURSOR }, failing, count)).rejects.toBe(broken);
    expect(failing).toHaveBeenCalledTimes(1);
  });
});
