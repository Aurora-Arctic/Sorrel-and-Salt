// The two lists the builder suggests from. Constants, not curated vocabulary tables like celestial
// bodies: the set is closed, typed text stays allowed, and the columns stay free text
// (claude-docs/db/grimoire.md).

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

export const DAYS_OF_THE_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;
