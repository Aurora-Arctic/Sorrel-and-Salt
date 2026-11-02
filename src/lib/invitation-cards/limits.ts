/** How many cards one Letter sheet holds: the print layout's grid, and the unit a batch is minted in. */
export const CARDS_PER_SHEET = 9;

/** The most sheets one mint makes: 55 sheets are 495 cards, the most whole sheets under 500 cards. */
export const MAX_SHEETS_PER_BATCH = 55;

/** How many days from today a new batch's expiry starts at on the mint form; the admin may change it. */
export const DEFAULT_EXPIRY_DAYS = 90;

/**
 * Where a card sits in its batch, from 1: its place in the token list the mint wrote, which is the order the print PDF lays the fronts out
 * (sheet by sheet, left to right then top to bottom).
 */
export function cardPlace(position: number): { sheet: number; card: number } {
  return {
    sheet: Math.floor((position - 1) / CARDS_PER_SHEET) + 1,
    card: ((position - 1) % CARDS_PER_SHEET) + 1,
  };
}

/** The most characters a batch's note holds, once trimmed; the database check says the same. */
export const MAX_NOTE_LENGTH = 500;
