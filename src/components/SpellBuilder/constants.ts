// The two lists the builder suggests from. Constants, not curated vocabulary tables like celestial
// bodies: the set is closed, typed text stays allowed, and the columns stay free text
// (claude-docs/db/grimoire.md).

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
