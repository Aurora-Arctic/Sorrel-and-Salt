import { isNull } from 'drizzle-orm';
// `./idempotent` (and through it `./bootstrap-admin`) first, and load-bearing — see minimal.ts.
import { beginSeedTransaction } from './idempotent';
import { categories, categoryGroups } from '../schema/categories';
import { seedTwoTierVocabulary } from './two-tier-vocabulary';
import type { SeedDatabase, SeedTransaction } from './index';

// DESIGN.md §6's vocabulary: eight groups and every category, a starting set
// an admin may edit. Not a scenario — migrate.yml seeds it on its own after
// migrating, so it inserts the bootstrap admin itself. No slug is written down:
// every one is `slugify(name)`, which expands `&` to `and`
// (claude-docs/db.md, "The category seed").

/**
 * Each group's name mapped to its key in M0.7's `$category-groups` Sass map —
 * keyed by name because the slug is derived. The two vocabularies meet here
 * and nowhere else.
 */
export const SASS_TOKEN_BY_GROUP_NAME: Record<string, string> = {
  'Protection & Defense': 'protection',
  'Cleansing & Release': 'cleansing',
  'Prosperity & Work': 'prosperity',
  'Love & Connection': 'love',
  'Mind & Spirit': 'mind',
  Wellbeing: 'wellbeing',
  'Craft & Change': 'craft',
  'Practice & Place': 'practice',
};

export interface SeedCategoryGroup {
  name: string;
  colorDark: string;
  colorLight: string;
  description: string;
}

export interface SeedCategory {
  name: string;
  /** The `name` of the group in CATEGORY_GROUPS this belongs to. */
  group: string;
  description: string;
}

/**
 * The eight groups in §6's order, each carrying the hex pair M0.7's
 * `category-group-color($slug, $theme)` resolves to. Written out rather than
 * computed because an admin owns the colour once seeded; categories.test.ts
 * compares all sixteen against the Sass function.
 */
export const CATEGORY_GROUPS: SeedCategoryGroup[] = [
  {
    name: 'Protection & Defense',
    colorDark: '#4e8bc2',
    colorLight: '#0c5393',
    description:
      'Work that keeps something out or sends it back — shields set in advance, and the undoing of harm already done.',
  },
  {
    name: 'Cleansing & Release',
    colorDark: '#35987d',
    colorLight: '#097255',
    description:
      'Work that clears what has gathered — washing a place, a person or a habit clean, and letting the rest go.',
  },
  {
    name: 'Prosperity & Work',
    colorDark: '#7b9132',
    colorLight: '#576d09',
    description:
      'Work aimed at livelihood — money, trade and standing, and the rulings and risks that move them.',
  },
  {
    name: 'Love & Connection',
    colorDark: '#cb6883',
    colorLight: '#930c31',
    description:
      'Work on the bonds between people — drawing them close, mending them, and keeping them steady.',
  },
  {
    name: 'Mind & Spirit',
    colorDark: '#8e7bd1',
    colorLight: '#2b0c93',
    description:
      'Work on perception and thought — seeing further, remembering better, and telling true from false.',
  },
  {
    name: 'Wellbeing',
    colorDark: '#379835',
    colorLight: '#0d770a',
    description: 'Work on the body and its ease — mending, resting, and the nerve to keep going.',
  },
  {
    name: 'Craft & Change',
    colorDark: '#c45dc7',
    colorLight: '#8f0c93',
    description:
      'Work on the shape of things — steadying yourself first, then making, altering and bringing about.',
  },
  {
    name: 'Practice & Place',
    colorDark: '#b7783f',
    colorLight: '#934c0c',
    description:
      'Work rooted in a household and its dead — the hearth, the road, and the company kept on both.',
  },
];

/** Every category §6 lists, in §6's order, grouped as §6 groups them. */
export const CATEGORIES: SeedCategory[] = [
  // Protection & defense
  {
    name: 'Protection',
    group: 'Protection & Defense',
    description: 'General shielding — keeping a person, place or thing from harm.',
  },
  {
    name: 'Warding',
    group: 'Protection & Defense',
    description: 'A boundary set in advance, so that what is unwelcome cannot cross it.',
  },
  {
    name: 'Banishing',
    group: 'Protection & Defense',
    description: 'Driving out something already present, and telling it not to return.',
  },
  {
    name: 'Hex-Breaking',
    group: 'Protection & Defense',
    description: 'Undoing a curse or ill-wishing that has already taken hold.',
  },
  {
    name: 'Uncrossing',
    group: 'Protection & Defense',
    description: 'Clearing a run of crossed luck, and the interference behind it.',
  },
  {
    name: 'Reversal',
    group: 'Protection & Defense',
    description: 'Turning harm back towards where it came from rather than absorbing it.',
  },
  {
    name: 'Nightmare Protection',
    group: 'Protection & Defense',
    description: 'Guarding sleep against bad dreams, night terrors and what rides them.',
  },
  {
    name: 'Binding',
    group: 'Protection & Defense',
    description: 'Holding something still so that it cannot act, rather than sending it away.',
  },

  // Cleansing & release
  {
    name: 'Cleansing',
    group: 'Cleansing & Release',
    description: 'Washing away what has gathered on a person, an object or a room.',
  },
  {
    name: 'Purification',
    group: 'Cleansing & Release',
    description: 'Restoring something to a fit state before it is used or entered.',
  },
  {
    name: 'Release',
    group: 'Cleansing & Release',
    description: 'Letting go of what is finished — an attachment, a vow, a season.',
  },
  {
    name: 'Forgiveness',
    group: 'Cleansing & Release',
    description: 'Setting down a grievance, whether it is owed to another or to yourself.',
  },
  {
    name: 'Grief Work',
    group: 'Cleansing & Release',
    description: 'Sitting with a loss, and giving mourning somewhere to go.',
  },
  {
    name: 'Shadow Work',
    group: 'Cleansing & Release',
    description: 'Meeting the parts of yourself you would rather not look at.',
  },

  // Prosperity & work
  {
    name: 'Prosperity',
    group: 'Prosperity & Work',
    description: 'Steady sufficiency — enough coming in, and coming in reliably.',
  },
  {
    name: 'Wealth',
    group: 'Prosperity & Work',
    description: 'Accumulation beyond sufficiency, and the keeping of it.',
  },
  {
    name: 'Abundance',
    group: 'Prosperity & Work',
    description: 'Plenty of a kind that is not only money — harvest, opportunity, welcome.',
  },
  {
    name: 'Success',
    group: 'Prosperity & Work',
    description: 'Carrying an undertaking through to the outcome you named for it.',
  },
  {
    name: 'Career',
    group: 'Prosperity & Work',
    description: 'The long arc of a working life — advancement, recognition, direction.',
  },
  {
    name: 'Business',
    group: 'Prosperity & Work',
    description: 'A trade or venture and its dealings — customers, contracts, growth.',
  },
  {
    name: 'Legal Matters',
    group: 'Prosperity & Work',
    description: 'Courts, contracts and officialdom, whichever side of them you are on.',
  },
  {
    name: 'Justice',
    group: 'Prosperity & Work',
    description: 'A fair outcome rather than merely a favourable one.',
  },
  {
    name: 'Gambling',
    group: 'Prosperity & Work',
    description: 'Games of chance, and the luck they turn on.',
  },

  // Love & connection
  {
    name: 'Love',
    group: 'Love & Connection',
    description: 'Love in general — its arrival, its deepening and its keeping.',
  },
  {
    name: 'Attraction',
    group: 'Love & Connection',
    description: 'Drawing notice and interest towards you.',
  },
  {
    name: 'Lust',
    group: 'Love & Connection',
    description: 'Desire and its heat, wanted for its own sake.',
  },
  {
    name: 'Self-Love',
    group: 'Love & Connection',
    description: 'Regard for yourself — your worth, your kindness and your own good opinion.',
  },
  {
    name: 'Friendship',
    group: 'Love & Connection',
    description: 'Companionship outside romance, and the making of it.',
  },
  {
    name: 'Reconciliation',
    group: 'Love & Connection',
    description: 'Repairing a bond that has been broken or strained.',
  },
  {
    name: 'Fidelity',
    group: 'Love & Connection',
    description: 'Constancy within a bond already made.',
  },
  {
    name: 'Harmony',
    group: 'Love & Connection',
    description: 'Ease between people sharing a life, a house or a table.',
  },

  // Mind & spirit
  {
    name: 'Psychic Work',
    group: 'Mind & Spirit',
    description: 'Perception past the ordinary senses, and the training of it.',
  },
  {
    name: 'Divination',
    group: 'Mind & Spirit',
    description: 'Putting a question to cards, bones, water or lot, and reading the answer.',
  },
  {
    name: 'Prophecy',
    group: 'Mind & Spirit',
    description: 'Foresight of what is coming, given rather than asked for.',
  },
  {
    name: 'Dream Work',
    group: 'Mind & Spirit',
    description: 'Attending to dreams — recalling them, reading them, working within them.',
  },
  {
    name: 'Intuition',
    group: 'Mind & Spirit',
    description: 'The quiet knowing that arrives before the reasoning does.',
  },
  {
    name: 'Wisdom',
    group: 'Mind & Spirit',
    description: 'Judgement seasoned by experience rather than by information.',
  },
  {
    name: 'Knowledge',
    group: 'Mind & Spirit',
    description: 'Learning, study, and the holding of what is learned.',
  },
  {
    name: 'Memory',
    group: 'Mind & Spirit',
    description: 'Recall — keeping what matters, and finding it again.',
  },
  {
    name: 'Clarity',
    group: 'Mind & Spirit',
    description: 'Seeing a situation plainly, with the noise taken out of it.',
  },
  {
    name: 'Meditation',
    group: 'Mind & Spirit',
    description: 'Stilling the mind on purpose, and staying there.',
  },
  {
    name: 'Truth',
    group: 'Mind & Spirit',
    description: 'Bringing what is hidden into the open, and telling honest from false.',
  },

  // Wellbeing
  {
    name: 'Healing',
    group: 'Wellbeing',
    description: 'Mending body or mind, and supporting what is already mending.',
  },
  {
    name: 'Peace',
    group: 'Wellbeing',
    description: 'Quiet within and around — the absence of agitation.',
  },
  {
    name: 'Sleep',
    group: 'Wellbeing',
    description: 'Falling asleep, staying asleep, and waking rested.',
  },
  {
    name: 'Joy',
    group: 'Wellbeing',
    description: 'Gladness and good spirits, sought deliberately rather than waited for.',
  },
  {
    name: 'Longevity',
    group: 'Wellbeing',
    description: 'Long life, and the vitality that makes it worth having.',
  },
  {
    name: 'Strength',
    group: 'Wellbeing',
    description: 'Endurance and physical power, for the work in front of you.',
  },
  {
    name: 'Courage',
    group: 'Wellbeing',
    description: 'Acting despite fear rather than in its absence.',
  },
  {
    name: 'Confidence',
    group: 'Wellbeing',
    description: 'Steadiness in your own capability, which others read as poise.',
  },

  // Craft & change
  {
    name: 'Grounding',
    group: 'Craft & Change',
    description: 'Settling into the body and the present, with your weight on the floor.',
  },
  {
    name: 'Manifestation',
    group: 'Craft & Change',
    description: 'Bringing an intention into the world in a form you can touch.',
  },
  {
    name: 'Transformation',
    group: 'Craft & Change',
    description: 'Deliberate change of state — of a situation, a habit, or yourself.',
  },
  {
    name: 'Creativity',
    group: 'Craft & Change',
    description: 'Making — the capacity to bring something into being.',
  },
  {
    name: 'Inspiration',
    group: 'Craft & Change',
    description: 'The arriving idea, and keeping the channel open for it.',
  },
  {
    name: 'Glamour',
    group: 'Craft & Change',
    description: 'Altering how you are perceived rather than what you are.',
  },

  // Practice & place
  {
    name: 'Ancestor Work',
    group: 'Practice & Place',
    description: 'Tending the dead of your own line, and asking their help.',
  },
  {
    name: 'Spirit Work',
    group: 'Practice & Place',
    description: 'Dealing with spirits that are not your dead — offerings, pacts, boundaries.',
  },
  {
    name: 'Home Blessing',
    group: 'Practice & Place',
    description: 'Setting a house right — its threshold, its hearth and its rooms.',
  },
  {
    name: 'Safe Travel',
    group: 'Practice & Place',
    description: 'Guarding a journey, and the traveller who makes it.',
  },
  {
    name: 'Communication',
    group: 'Practice & Place',
    description: 'Being heard and understood, and hearing others plainly in return.',
  },
  {
    name: 'Fertility',
    group: 'Practice & Place',
    description: 'Conception, bearing, and fruitfulness of the literal kind.',
  },
  {
    name: 'Familiar Work',
    group: 'Practice & Place',
    description: 'The bond with an animal or spirit companion kept for the work.',
  },
];

/**
 * Seeds §6's groups, then its categories, in a transaction of its own. Writes
 * go through the handle the caller gives, not `withAudit` — see minimal.ts.
 */
export async function seedCategories(db: SeedDatabase): Promise<void> {
  await beginSeedTransaction(db, seedCategoryVocabulary);
}

/**
 * The same seed inside a transaction the caller opened, so `standard` is never
 * half-applied. Assumes the GUC is published and the bootstrap admin exists.
 */
export async function seedCategoryVocabulary(tx: SeedTransaction): Promise<void> {
  await seedTwoTierVocabulary(tx, {
    groupTable: categoryGroups,
    itemTable: categories,
    groups: CATEGORY_GROUPS,
    items: CATEGORIES,
    itemNoun: 'Category',
  });
}

/**
 * Live category ids by *name*, which is what both scenarios name.
 * `deleted_at IS NULL`: a retired category is not one a seed may point at.
 */
export async function categoryIdByName(tx: SeedTransaction): Promise<Map<string, string>> {
  const rows = await tx
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(isNull(categories.deletedAt));

  return new Map(rows.map((row) => [row.name, row.id]));
}
