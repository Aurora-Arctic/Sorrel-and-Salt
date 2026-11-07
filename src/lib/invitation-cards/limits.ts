export const CARDS_PER_SHEET = 10;

export const MAX_SHEETS_PER_BATCH = 50;

export const DEFAULT_EXPIRY_DAYS = 90;

export function cardPlace(position: number): { sheet: number; card: number } {
  return {
    sheet: Math.floor((position - 1) / CARDS_PER_SHEET) + 1,
    card: ((position - 1) % CARDS_PER_SHEET) + 1,
  };
}

/** The most characters a batch's note holds, once trimmed; the database check says the same. */
export const MAX_NOTE_LENGTH = 500;
