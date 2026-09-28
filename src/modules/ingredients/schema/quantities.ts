// The shape of a stock amount, written down once: inventory-items.ts builds
// both numeric columns from it and ../validation/stock.ts refuses what they
// cannot hold. Imports nothing, like units.ts, so the form can reach it.

// `numeric`, not a float, so 0.1 kg round-trips as 0.1; three decimals is a
// milligram in grams.
export const QUANTITY_PRECISION = 12;
export const QUANTITY_SCALE = 3;

/** The largest amount the columns hold: 999,999,999.999. Past it Postgres overflows. */
export const MAX_QUANTITY = 10 ** (QUANTITY_PRECISION - QUANTITY_SCALE) - 10 ** -QUANTITY_SCALE;
