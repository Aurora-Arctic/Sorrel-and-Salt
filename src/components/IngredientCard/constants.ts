// How many category chips a card shows before the rest go behind its +N button. The owner
// found a full grid of coloured chips too loud (2026-10-19). Two chips and the +N button
// share one line on the regular card at its 20rem width with typical seeded category names
// (median nine letters; three never fit); a narrower card, or longer names, wrap to a second line. claude-docs/components/ingredient-card.md.
export const CATEGORY_CHIP_LIMIT = 2;
