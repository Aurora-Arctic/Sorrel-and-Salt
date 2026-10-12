import { describe, expect, it } from 'vitest';
import { encodeCursor } from '@/lib/pagination';
import { readPageCursors } from '@/lib/numbered-page';

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
