import { describe, expect, it } from 'vitest';
import { CARDS_PER_SHEET, MAX_SHEETS_PER_BATCH, sheetCount } from '@/lib/invitation-cards/limits';

const FULL_BATCH = MAX_SHEETS_PER_BATCH * CARDS_PER_SHEET;

describe('sheetCount', () => {
  it.each([
    [1, 1],
    [CARDS_PER_SHEET, 1],
    [CARDS_PER_SHEET + 1, 2],
    [2 * CARDS_PER_SHEET, 2],
    [2 * CARDS_PER_SHEET + 1, 3],
    [FULL_BATCH - CARDS_PER_SHEET + 1, MAX_SHEETS_PER_BATCH],
    [FULL_BATCH, MAX_SHEETS_PER_BATCH],
    [FULL_BATCH + 1, MAX_SHEETS_PER_BATCH + 1],
  ])('puts %i cards on %i sheets, a part sheet counting as one', (cards, sheets) => {
    expect(sheetCount(cards)).toBe(sheets);
  });
});
