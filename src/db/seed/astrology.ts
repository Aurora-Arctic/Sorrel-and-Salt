import { beginSeedTransaction } from './idempotent';
import { celestialBodies, zodiacSigns } from '../../modules/vocabulary/schema/astrology';
import { seedFlatVocabulary } from './flat-vocabulary';
import type { SeedAstrologyValue, SeedDatabase, SeedRunOptions, SeedTransaction } from './types';

// The celestial body and zodiac vocabularies, a starting set an admin may edit. Reference data, so it inserts the bootstrap user itself. Names are
// proper nouns and no slug is written down; a description is search surface, so it carries the words a reader reaches for (claude-docs/db/astrology-vocabulary-seed.md, "The astrology vocabulary seed").

// `position` is where a facet lists the row: the calendar for signs,
// Ophiuchus after Pisces, and the Sun outward for the bodies. The rest have none,
// as a curator's additions have none, and sort after by name.

/** The luminaries, the planets outward from the Sun, then the other bodies modern practice reads. */
export const CELESTIAL_BODIES: SeedAstrologyValue[] = [
  {
    name: 'Sun',
    position: 1,
    description: 'The luminary of the day, Sol - vitality, success, the self.',
  },
  {
    name: 'Moon',
    position: 2,
    description: 'The luminary of the night, Luna - dreams, intuition, cycles.',
  },
  { name: 'Mercury', position: 3, description: 'The messenger - speech, travel, trade, cunning.' },
  {
    name: 'Venus',
    position: 4,
    description: 'The morning and evening star - love, beauty, pleasure.',
  },
  { name: 'Earth', position: 5, description: 'The ground underfoot - the body, stability, home.' },
  {
    name: 'Mars',
    position: 6,
    description: 'The red planet - courage, conflict, protection, drive.',
  },
  {
    name: 'Jupiter',
    position: 7,
    description: 'The greater benefic - luck, abundance, expansion, law.',
  },
  {
    name: 'Saturn',
    position: 8,
    description: 'The greater malefic - limits, time, binding, endurance.',
  },
  {
    name: 'Uranus',
    position: 9,
    description: 'The awakener - upheaval, invention, sudden change.',
  },
  {
    name: 'Neptune',
    position: 10,
    description: 'The planet of the sea - illusion, mysticism, psychic sight.',
  },
  {
    name: 'Pluto',
    position: 11,
    description: 'The planet of the underworld - death, rebirth, hidden power.',
  },
  {
    name: 'Chiron',
    description: 'The wounded healer, a centaur orbiting between Saturn and Uranus.',
  },
  {
    name: 'Ceres',
    description: 'The celestial body of the harvest, Demeter - nourishment, grief, return.',
  },
  { name: 'Pallas', description: 'The celestial body Pallas Athene - wisdom, strategy, craft.' },
  {
    name: 'Juno',
    description: 'The celestial body of marriage, Hera - partnership, loyalty, vows.',
  },
  {
    name: 'Vesta',
    description: 'The celestial body of the hearth, Hestia - devotion, focus, the sacred flame.',
  },
  {
    name: 'Lilith',
    description: 'Black Moon Lilith, the Moon’s farthest point - the wild, the refused.',
  },
  {
    name: 'North Node',
    description: 'The Moon’s ascending node, Rahu or the Dragon’s Head - what is sought.',
  },
  {
    name: 'South Node',
    description: 'The Moon’s descending node, Ketu or the Dragon’s Tail - what is released.',
  },
];

/** Ophiuchus sits where the sidereal thirteen-sign zodiac puts it. */
export const ZODIAC_SIGNS: SeedAstrologyValue[] = [
  {
    name: 'Aries',
    position: 1,
    description: 'The Ram, cardinal fire - courage, beginnings, drive.',
  },
  {
    name: 'Taurus',
    position: 2,
    description: 'The Bull, fixed earth - stability, sensuality, abundance.',
  },
  {
    name: 'Gemini',
    position: 3,
    description: 'The Twins, mutable air - communication, curiosity, duality.',
  },
  {
    name: 'Cancer',
    position: 4,
    description: 'The Crab, cardinal water - home, nurture, protection.',
  },
  {
    name: 'Leo',
    position: 5,
    description: 'The Lion, fixed fire - confidence, creativity, pride.',
  },
  {
    name: 'Virgo',
    position: 6,
    description: 'The Maiden, mutable earth - service, health, discernment.',
  },
  {
    name: 'Libra',
    position: 7,
    description: 'The Scales, cardinal air - balance, justice, partnership.',
  },
  {
    name: 'Scorpio',
    position: 8,
    description: 'The Scorpion, fixed water - passion, secrets, transformation.',
  },
  {
    name: 'Ophiuchus',
    position: 13,
    description: 'The Serpent Bearer, Serpentarius - healing, medicine, hidden knowledge, rebirth.',
  },
  {
    name: 'Sagittarius',
    position: 9,
    description: 'The Archer, mutable fire - adventure, wisdom, freedom.',
  },
  {
    name: 'Capricorn',
    position: 10,
    description: 'The Sea-Goat, cardinal earth - ambition, discipline, endurance.',
  },
  {
    name: 'Aquarius',
    position: 11,
    description: 'The Water Bearer, fixed air - innovation, friendship, independence.',
  },
  {
    name: 'Pisces',
    position: 12,
    description: 'The Fishes, mutable water - dreams, compassion, intuition.',
  },
];

/**
 * Seeds both vocabularies in a transaction of their own. Writes go through the
 * handle the caller gives, not `withAudit` — see minimal.ts.
 */
export async function seedAstrology(db: SeedDatabase, options: SeedRunOptions = {}): Promise<void> {
  await beginSeedTransaction(db, seedAstrologyVocabularies, options);
}

/**
 * The same seed inside a transaction the caller opened, since `standard` writes
 * these vocabularies alongside the compendium drawing on them. Assumes the GUC
 * is published and the bootstrap user exists.
 */
export async function seedAstrologyVocabularies(tx: SeedTransaction): Promise<void> {
  await seedFlatVocabulary(tx, celestialBodies, CELESTIAL_BODIES);
  await seedFlatVocabulary(tx, zodiacSigns, ZODIAC_SIGNS);
}
