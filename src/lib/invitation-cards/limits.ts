/** How many cards one Letter sheet holds: the print layout's grid, and the unit a batch is minted in. */
export const CARDS_PER_SHEET = 9;

/** The most sheets one mint makes: 55 sheets are 495 cards, the most whole sheets under 500 cards. */
export const MAX_SHEETS_PER_BATCH = 55;

/** How many days from today a new batch's expiry starts at on the mint form; the admin may change it. */
export const DEFAULT_EXPIRY_DAYS = 90;
