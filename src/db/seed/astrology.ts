// `./idempotent` (and through it `./bootstrap-admin`) first, and load-bearing — see minimal.ts.
import { beginSeedTransaction } from './idempotent';
import { planets, zodiacSigns } from '../../modules/vocabulary/schema/astrology';
import { seedFlatVocabulary } from './flat-vocabulary';
import type { SeedDatabase, SeedTransaction } from './index';

// DESIGN.md §5's planet and zodiac vocabularies, a starting set an admin may
// edit. Reference data, not a scenario — migrate.yml seeds it alone, so it
// inserts the bootstrap admin itself. §5's table is lower-case; each name here
// is the proper noun it renders as, and no slug is written down. A description
// is search surface, so it carries the words a reader reaches for — Black
// Moon, Rahu, Serpentarius (claude-docs/db.md, "The astrology vocabulary seed").

export interface SeedAstrologyValue {
  name: string;
  description: string;
}

/** The luminaries, the planets outward from the Sun, then the other bodies modern practice reads. */
export const PLANETS: SeedAstrologyValue[] = [
  { name: 'Sun', description: 'The luminary of the day, Sol - vitality, success, the self.' },
  { name: 'Moon', description: 'The luminary of the night, Luna - dreams, intuition, cycles.' },
  { name: 'Mercury', description: 'The messenger - speech, travel, trade, cunning.' },
  { name: 'Venus', description: 'The morning and evening star - love, beauty, pleasure.' },
  { name: 'Earth', description: 'The ground underfoot - the body, stability, home.' },
  { name: 'Mars', description: 'The red planet - courage, conflict, protection, drive.' },
  { name: 'Jupiter', description: 'The greater benefic - luck, abundance, expansion, law.' },
  { name: 'Saturn', description: 'The greater malefic - limits, time, binding, endurance.' },
  { name: 'Uranus', description: 'The awakener - upheaval, invention, sudden change.' },
  { name: 'Neptune', description: 'The planet of the sea - illusion, mysticism, psychic sight.' },
  {
    name: 'Pluto',
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
  { name: 'Aries', description: 'The Ram, cardinal fire - courage, beginnings, drive.' },
  { name: 'Taurus', description: 'The Bull, fixed earth - stability, sensuality, abundance.' },
  { name: 'Gemini', description: 'The Twins, mutable air - communication, curiosity, duality.' },
  { name: 'Cancer', description: 'The Crab, cardinal water - home, nurture, protection.' },
  { name: 'Leo', description: 'The Lion, fixed fire - confidence, creativity, pride.' },
  { name: 'Virgo', description: 'The Maiden, mutable earth - service, health, discernment.' },
  { name: 'Libra', description: 'The Scales, cardinal air - balance, justice, partnership.' },
  { name: 'Scorpio', description: 'The Scorpion, fixed water - passion, secrets, transformation.' },
  {
    name: 'Ophiuchus',
    description: 'The Serpent Bearer, Serpentarius - healing, medicine, hidden knowledge, rebirth.',
  },
  { name: 'Sagittarius', description: 'The Archer, mutable fire - adventure, wisdom, freedom.' },
  {
    name: 'Capricorn',
    description: 'The Sea-Goat, cardinal earth - ambition, discipline, endurance.',
  },
  {
    name: 'Aquarius',
    description: 'The Water Bearer, fixed air - innovation, friendship, independence.',
  },
  { name: 'Pisces', description: 'The Fishes, mutable water - dreams, compassion, intuition.' },
];

/**
 * Seeds both vocabularies in a transaction of their own. Writes go through the
 * handle the caller gives, not `withAudit` — see minimal.ts.
 */
export async function seedAstrology(db: SeedDatabase): Promise<void> {
  await beginSeedTransaction(db, seedAstrologyVocabularies);
}

/**
 * The same seed inside a transaction the caller opened, since `standard` writes
 * these vocabularies alongside the compendium drawing on them. Assumes the GUC
 * is published and the bootstrap admin exists.
 */
export async function seedAstrologyVocabularies(tx: SeedTransaction): Promise<void> {
  await seedFlatVocabulary(tx, planets, PLANETS);
  await seedFlatVocabulary(tx, zodiacSigns, ZODIAC_SIGNS);
}
