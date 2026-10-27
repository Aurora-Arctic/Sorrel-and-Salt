// The two lists the spell builder suggests from (the owner, 2026-10-27). Each
// is a constant, not a curated vocabulary table as celestial bodies are
// (MB.91): the set is closed, typed text stays allowed beside it, and adding a
// name is a one-line change here, where the celestial bodies keep growing.
// The columns stay free text (claude-docs/db/grimoire.md).

/**
 * The moon's eight phases, in their cycle's order: the four principal phases
 * and the four between them. Source: Wikipedia, "Lunar phase".
 */
export const MOON_PHASES = [
  'New Moon',
  'Waxing Crescent',
  'First Quarter',
  'Waxing Gibbous',
  'Full Moon',
  'Waning Gibbous',
  'Last Quarter',
  'Waning Crescent',
] as const;

/**
 * The seven days of the week, Monday first. Source: Wikipedia, "Names of the
 * days of the week".
 */
export const DAYS_OF_THE_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;
