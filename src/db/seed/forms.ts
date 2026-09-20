// `./idempotent` (and through it `./bootstrap-admin`) first, and load-bearing — see minimal.ts.
import { beginSeedTransaction } from './idempotent';
import { ingredientFormGroups, ingredientForms } from '../schema/ingredient-forms';
import { seedTwoTierVocabulary } from './two-tier-vocabulary';
import type { SeedDatabase, SeedTransaction } from './index';

// DESIGN.md §5's form vocabulary: six groups and every form, a starting set an
// admin may edit. Reference data, not a scenario — migrate.yml seeds it alone,
// so it inserts the bootstrap admin itself. The groups answer "what are you
// holding", not "how was it made": three by source (Botanical, Animal, Mineral),
// three by state (Fluid, Curio, Substance), and no `Other` — an unfitting value
// stays free text and surfaces for curation. No slug is written down; every one
// is `slugify(name)`. Where a value fits two groups the seed takes one sense and
// leaves the other row for an admin (claude-docs/db.md, "The form vocabulary seed").

export interface SeedIngredientFormGroup {
  name: string;
  description: string;
}

export interface SeedIngredientForm {
  name: string;
  /** The `name` of the group in FORM_GROUPS this belongs to. */
  group: string;
  description: string;
}

/**
 * §5's six groups in §5's order, which nothing reads — groups list
 * alphabetically — kept so the two compare by eye and by test.
 */
export const FORM_GROUPS: SeedIngredientFormGroup[] = [
  { name: 'Botanical', description: 'Parts of a plant or fungus - grown in the dirt.' },
  { name: 'Animal', description: 'Parts of a creature - roaming the land.' },
  { name: 'Mineral', description: 'Stone, salt, earth, metal - dug from the earth.' },
  {
    name: 'Substance',
    description: 'Powders, waxes and ointments - no shape of its own.',
  },
  { name: 'Fluid', description: 'Anything that pours - waters, oils, spirits.' },
  { name: 'Curio', description: 'Made or found objects.' },
];

/** Every form §5 lists, in §5's order, so forms.test.ts can compare row by row. */
export const FORMS: SeedIngredientForm[] = [
  // Botanical
  {
    name: 'Herb',
    group: 'Botanical',
    description: 'Leaf, stem and flower cut together.',
  },
  {
    name: 'Root',
    group: 'Botanical',
    description: 'The underground structure that brings water to the plant.',
  },
  {
    name: 'Bark',
    group: 'Botanical',
    description: 'The skin of a trunk, branch or root, stripped off in sheets or chips.',
  },
  {
    name: 'Flower',
    group: 'Botanical',
    description: 'The bloom fully open.',
  },
  {
    name: 'Leaf',
    group: 'Botanical',
    description: 'The green part of a plant that gathers the sun.',
  },
  {
    name: 'Seed',
    group: 'Botanical',
    description: 'The pip, kernel or bean, dried.',
  },
  {
    name: 'Fruit',
    group: 'Botanical',
    description: 'The flesh around a seed.',
  },
  { name: 'Peel', group: 'Botanical', description: 'The rind or zest pared off a fruit.' },
  {
    name: 'Stem',
    group: 'Botanical',
    description: 'The stalk, cane or vine.',
  },
  {
    name: 'Wood',
    group: 'Botanical',
    description: 'Chips, twigs or shavings from under the bark.',
  },
  {
    name: 'Sap',
    group: 'Botanical',
    description: 'Fluid from a living plant.',
  },
  {
    name: 'Resin',
    group: 'Botanical',
    description: 'Hardened plant secretion - gum, pitch, tears.',
  },
  {
    name: 'Pollen',
    group: 'Botanical',
    description: 'The fine dust a flower sheds.',
  },
  {
    name: 'Whole',
    group: 'Botanical',
    description: 'The entire plant or fungus.',
  },
  {
    name: 'Berry',
    group: 'Botanical',
    description: 'A small soft fruit.',
  },
  { name: 'Nut', group: 'Botanical', description: 'A seed in a hard shell.' },
  { name: 'Bud', group: 'Botanical', description: 'The flower before it opens.' },
  { name: 'Petal', group: 'Botanical', description: 'Loose petals from the flower.' },
  { name: 'Thorn', group: 'Botanical', description: 'A spine or prickle off a stem.' },
  {
    name: 'Moss',
    group: 'Botanical',
    description: 'Moss or lichen, in the mat it grew as.',
  },
  {
    name: 'Mushroom',
    group: 'Botanical',
    description: 'The fruiting body of a fungus - cap, gills, stem.',
  },
  {
    name: 'Bulb',
    group: 'Botanical',
    description: 'A layered underground bud - garlic, onion, lily.',
  },
  {
    name: 'Pod',
    group: 'Botanical',
    description: 'The case several seeds grew in, whole or split.',
  },

  // Animal
  {
    name: 'Bone',
    group: 'Animal',
    description: 'Bone kept from a carcass.',
  },
  { name: 'Claw', group: 'Animal', description: 'A claw, talon, hoof or nail.' },
  { name: 'Feather', group: 'Animal', description: 'A feather.' },
  { name: 'Shell', group: 'Animal', description: 'A mollusc shell, carapace or eggshell.' },
  { name: 'Tooth', group: 'Animal', description: 'A tooth or tusk.' },
  {
    name: 'Fur',
    group: 'Animal',
    description: 'Fur, hair, wool or whisker, cut loose.',
  },
  {
    name: 'Shed',
    group: 'Animal',
    description: 'What the creature dropped itself - snakeskin, moult, or etc.',
  },
  {
    name: 'Egg',
    group: 'Animal',
    description: 'An egg, whole or its contents.',
  },
  {
    name: 'Horn',
    group: 'Animal',
    description: 'Horn, kept for life and never dropped.',
  },
  {
    name: 'Antler',
    group: 'Animal',
    description: 'Antler cut from the animal, grown and cast yearly.',
  },
  { name: 'Scale', group: 'Animal', description: 'Fish, snake or lizard scales.' },
  { name: 'Skin', group: 'Animal', description: 'Hide or leather, fur on or off.' },
  { name: 'Pearl', group: 'Animal', description: 'A pearl, whole or crushed.' },
  { name: 'Coral', group: 'Animal', description: 'Coral, as a branch or a bead.' },
  {
    name: 'Specimen',
    group: 'Animal',
    description: 'A whole creature - insect, fish, frog.',
  },

  // Mineral
  {
    name: 'Crystal',
    group: 'Mineral',
    description: 'A crystalline mineral - raw, tumbled or cut.',
  },
  { name: 'Salt', group: 'Mineral', description: 'Salt of any kind - sea, rock, black.' },
  { name: 'Stone', group: 'Mineral', description: 'A pebble, rock or hagstone, not crystalline.' },
  {
    name: 'Clay',
    group: 'Mineral',
    description: 'Earth fine enough to shape and fire.',
  },
  { name: 'Sand', group: 'Mineral', description: 'Loose grains of ground stone.' },
  {
    name: 'Earth',
    group: 'Mineral',
    description: 'Soil or dirt from a named place - graveyard, crossroads, doorstep.',
  },
  {
    name: 'Metal',
    group: 'Mineral',
    description: 'Metal as material - iron scrap, lead, filings, gold leaf.',
  },
  { name: 'Chalk', group: 'Mineral', description: 'Chalk as a stick or lump.' },

  // Substance
  {
    name: 'Powder',
    group: 'Substance',
    description: 'Anything milled fine, its source no longer visible.',
  },
  {
    name: 'Ash',
    group: 'Substance',
    description: 'What is left when something burns away.',
  },
  {
    name: 'Wax',
    group: 'Substance',
    description: 'Rendered wax, set.',
  },
  {
    name: 'Charcoal',
    group: 'Substance',
    description: 'Wood or bone burned black.',
  },
  {
    name: 'Pigment',
    group: 'Substance',
    description: 'A powder kept for colour - ochre, lampblack.',
  },
  {
    name: 'Ointment',
    group: 'Substance',
    description: 'A blend in base, spread on the skin - a salve or a balm.',
  },
  { name: 'Soap', group: 'Substance', description: 'A bar or cake for washing.' },
  {
    name: 'Incense',
    group: 'Substance',
    description: 'A blend burned for its smoke - loose, cone or stick.',
  },
  { name: 'Paste', group: 'Substance', description: 'A thick wet blend, too stiff to pour.' },

  // Fluid
  {
    name: 'Liquid',
    group: 'Fluid',
    description: 'A watery fluid.',
  },
  {
    name: 'Oil',
    group: 'Fluid',
    description: 'Pressed or infused, and fatty.',
  },
  {
    name: 'Water',
    group: 'Fluid',
    description: 'Water gathered or charged - moon, storm, holy, spring.',
  },
  {
    name: 'Vinegar',
    group: 'Fluid',
    description: 'Vinegar, plain or steeped.',
  },
  {
    name: 'Spirit',
    group: 'Fluid',
    description: 'Drinking alcohol - rum, whisky, vodka, gin.',
  },
  {
    name: 'Concoction',
    group: 'Fluid',
    description:
      'Something drawn out of plant matter into a liquid - a tincture, an infusion, a tea, a decoction, a hydrosol, a wash.',
  },
  { name: 'Ink', group: 'Fluid', description: 'Pigment bound wet, for writing.' },
  {
    name: 'Syrup',
    group: 'Fluid',
    description: 'Sugar cooked into a liquid - molasses, simple syrup.',
  },
  {
    name: 'Honey',
    group: 'Fluid',
    description: 'Honey and comb from the hive.',
  },
  {
    name: 'Perfume',
    group: 'Fluid',
    description: 'A blend worn for scent - cologne, scent oil, floral water.',
  },

  // Curio
  {
    name: 'Curio',
    group: 'Curio',
    description:
      'A made or found object no other form names - lodestone, rabbit’s foot, lucky hand.',
  },
  {
    name: 'Candle',
    group: 'Curio',
    description: 'Wax shaped and wicked - taper, pillar, tealight, figure.',
  },
  {
    name: 'Cord',
    group: 'Curio',
    description: 'Thread, string, ribbon or cord.',
  },
  { name: 'Coin', group: 'Curio', description: 'A coin or token.' },
  { name: 'Nail', group: 'Curio', description: 'A nail, pin or tack - iron, coffin, horseshoe.' },
  { name: 'Key', group: 'Curio', description: 'A key.' },
  {
    name: 'Charm',
    group: 'Curio',
    description: 'A figured object worn or carried - pendant, medal.',
  },
  {
    name: 'Bead',
    group: 'Curio',
    description: 'A bead, loose or strung - glass, seed, stone, bone.',
  },
  { name: 'Bottle', group: 'Curio', description: 'A bottle, jar, vial or phial.' },
  {
    name: 'Poppet',
    group: 'Curio',
    description: 'A figure made to stand for someone - cloth, wax, clay, corn.',
  },
  {
    name: 'Paper',
    group: 'Curio',
    description: 'Paper, parchment or card - petition, sigil, page.',
  },
  { name: 'Mirror', group: 'Curio', description: 'A mirror, or a piece of one.' },
  { name: 'Bell', group: 'Curio', description: 'A bell or chime.' },
];

/**
 * Seeds §5's groups, then its forms, in a transaction of its own. Writes go
 * through the handle the caller gives, not `withAudit` — see minimal.ts.
 */
export async function seedForms(db: SeedDatabase): Promise<void> {
  await beginSeedTransaction(db, seedFormVocabulary);
}

/**
 * The same seed inside a transaction the caller opened, since `standard` writes
 * this vocabulary alongside the compendium drawing on it. Assumes the GUC is
 * published and the bootstrap admin exists.
 */
export async function seedFormVocabulary(tx: SeedTransaction): Promise<void> {
  await seedTwoTierVocabulary(tx, {
    groupTable: ingredientFormGroups,
    itemTable: ingredientForms,
    groups: FORM_GROUPS,
    items: FORMS,
    itemNoun: 'Form',
  });
}
