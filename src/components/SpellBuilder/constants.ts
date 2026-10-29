// The two lists the spell builder suggests from. Each
// is a constant, not a curated vocabulary table as celestial bodies are
//: the set is closed, typed text stays allowed beside it, and adding a
// name is a one-line change here, where the celestial bodies keep growing.
// The columns stay free text (claude-docs/db/grimoire.md).

/**
 * The moon's phases, in a fixed order: the cycle's eight
 * phases, New Moon to Waning Crescent, then the three names that are not one
 * of the eight. Dark Moon is the span around the new moon when no crescent
 * shows; Waxing Moon and Waning Moon are the two halves of the cycle, new to
 * full and full to new, for a recipe that asks for a half rather than one
 * phase.
 *
 * Sources: Wikipedia, "Lunar Phase," accessed October 27, 2026,
 * https://en.wikipedia.org/wiki/Lunar_phase; Wikipedia, "Dark Moon,"
 * accessed October 27, 2026, https://en.wikipedia.org/wiki/Dark_moon.
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
  'Dark Moon',
  'Waxing Moon',
  'Waning Moon',
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
