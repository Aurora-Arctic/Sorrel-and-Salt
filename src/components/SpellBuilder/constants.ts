// The two lists the spell builder suggests from. Each
// is a constant, not a curated vocabulary table as celestial bodies are
//: the set is closed, typed text stays allowed beside it, and adding a
// name is a one-line change here, where the celestial bodies keep growing.
// The columns stay free text (claude-docs/db/grimoire.md).

/**
 * The moon's phases in a fixed order: the eight phases, then Dark Moon, Waxing Moon and Waning Moon (a half-cycle for a recipe asking for a half).
 * Sources: Wikipedia, "Lunar Phase," accessed October 27, 2026, https://en.wikipedia.org/wiki/Lunar_phase; Wikipedia, "Dark Moon," accessed October 27, 2026, https://en.wikipedia.org/wiki/Dark_moon.
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
