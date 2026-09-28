// What IngredientForm offers for `planet` and `zodiac` — suggestions, not a
// constraint. Practices differ on both (the asteroids and nodes, a
// thirteen-sign sidereal zodiac), so any closed list would refuse someone's;
// the schema takes any non-blank value, as it does for `form`
// (claude-docs/validation.md, "The two ingredient variants").

// The luminaries, the planets outward from the Sun, then the other bodies
// modern practice reads.
export const PLANET_SUGGESTIONS = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
  'chiron',
  'ceres',
  'pallas',
  'juno',
  'vesta',
  'lilith',
  'north node',
  'south node',
] as const;

// Ophiuchus sits where the sidereal thirteen-sign zodiac puts it.
export const ZODIAC_SUGGESTIONS = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'ophiuchus',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
] as const;
