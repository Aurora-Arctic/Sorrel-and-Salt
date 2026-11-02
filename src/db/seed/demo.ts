import { beginSeedTransaction } from './idempotent';
import { categoryIdByName } from './categories';
import { assertCompendiumValid, seedCompendiumContent } from './compendium';
import { loadCompendium } from './compendium/load';
import { seedDemoCovenSeats } from './demo-coven';
import { seedDemoCovenContent } from './demo-coven-content';
import { seedInvitationCards } from './invitation-cards';
import { seedSupportRequests } from './support-requests';
import { DEMO_WORKINGS } from './demo-workings';
import {
  identityOf,
  ingredientIdByIdentity,
  insertMissingCupboardEntries,
  insertMissingSpellCategories,
  insertMissingSpells,
  insertMissingStock,
  insertMissingSteps,
  insertMissingVariants,
  insertMissingWorkings,
  insertMissingWorkspaceIngredients,
  variantIdByIngredient,
  workspaceIngredientIds,
} from './coven-content';
import {
  COMPENDIUM_INGREDIENTS,
  FIXTURE_USERS,
  STANDARD_CUPBOARD,
  STANDARD_STOCK,
  WORKSPACE_W_ID,
  reslugIngredients,
  seedStandardContent,
} from './standard';
import type {
  NamedIngredient,
  SeedCupboardEntry,
  SeedDatabase,
  SeedSpell,
  SeedStock,
  SeedTransaction,
  SeedWorkspaceIngredient,
} from './types';

// The `demo` scenario: `standard` plus spells with ingredients and layer order, written as a member would, since
// screenshots are taken against it. It adds W's cupboard, W's own ingredients, a custom one-off layer and seven jars
// (claude-docs/db/demo-scenario.md, "The demo scenario"). Writes use the handle `seed()` was given, not `withAudit`.

/** A one-field stub: a thing no naming system names, so `none`. */
const HEARTH_ASH: SeedWorkspaceIngredient = {
  name: 'Hearth Ash',
  nomenclature: 'none',
  variants: [{ form: 'ash' }],
  description: 'Swept cold from the grate after a Yule fire and kept in a tin.',
  elements: ['fire'],
};

/**
 * The "Similar in the Compendium" case: bought as "cat's claw" with no formal name, so an own stub beside the compendium's
 * five Cat's Claws. A member can declare it one of them. It shares a name with the compendium and hides none: a name match hides nothing.
 */
const CATS_CLAW: SeedWorkspaceIngredient = {
  name: "Cat's Claw",
  nomenclature: 'unknown',
  variants: [{ form: 'bark' }],
  description:
    'Bought as "cat\'s claw" from a market stall, and the seller could not say which plant it was.',
  elements: ['earth'],
};

/**
 * W's cupboard in `demo`: the `standard` rows, the curated German Chamomile relabelled with a colour the compendium does not
 * list, and the two entries the spells lay that `standard` does not hold. A spell step names only what the coven holds, and
 * the seed writes raw, so it holds them here.
 */
export const WORKSPACE_W_CUPBOARD: SeedCupboardEntry[] = [
  ...STANDARD_CUPBOARD,
  // The compendium's German Chamomile, relabelled, with a colour it does not list.
  {
    entry: { name: 'German Chamomile', canonicalName: 'Matricaria chamomilla' },
    label: 'House Chamomile',
    colors: ['white', 'yellow'],
  },
  // Held and not annotated, for the Hearth Warding Jar's and the Dreaming Sachet's layers.
  { entry: { name: 'Black Salt' } },
  { entry: { name: 'Amethyst', canonicalName: 'Quartz var. amethyst' } },
];

/** Everything W has of its own. Seeded into W, and invisible from X. */
export const WORKSPACE_W_INGREDIENTS: SeedWorkspaceIngredient[] = [HEARTH_ASH, CATS_CLAW];

/**
 * The curated compendium, read from the files under `compendium/` once, at
 * module load, because the spells below look their entries up then.
 */
const CURATED_FILES = loadCompendium();

/**
 * A compendium entry, `standard` or an `approved` file, looked up at module load, so a layer naming a missing entry fails on
 * import rather than at a foreign key. A file held back from `approved` is not seeded, so a layer may not name it.
 */
function fromCompendium(name: string, canonicalName?: string): NamedIngredient {
  const curated = CURATED_FILES.files.filter((file) => file.status === 'approved');
  const entry = [...COMPENDIUM_INGREDIENTS, ...curated.map((file) => file.entry)].find(
    (candidate) =>
      candidate.name === name && (candidate.canonicalName ?? undefined) === canonicalName,
  );

  if (entry === undefined) {
    throw new Error(
      `The demo scenario names "${name}", which the standard compendium does not seed.`,
    );
  }

  return { tier: 'compendium', entry };
}
function fromWorkspace(entry: SeedWorkspaceIngredient): NamedIngredient {
  return { tier: 'workspace', entry };
}

/**
 * W's stock in `demo`: the `standard` jars, plus jars on entries only `demo` seeds in the ids `…0001`, `…0002`, `…0005` and
 * `…0006` that `standard` leaves free. Every compendium entry named is in `WORKSPACE_W_CUPBOARD`.
 */
export const DEMO_STOCK: SeedStock[] = [
  ...STANDARD_STOCK,
  // Own entries.
  {
    id: '00000000-0000-0000-0003-000000000001',
    ingredient: fromWorkspace(HEARTH_ASH),
    form: 'ash',
    quantity: '250.000',
    unit: 'g',
    source: 'Swept from the grate after the Yule fire',
    acquiredDate: '2025-12-22',
  },
  // Held and never weighed: no quantity and no unit, so no threshold either.
  {
    id: '00000000-0000-0000-0003-000000000002',
    ingredient: fromWorkspace(CATS_CLAW),
    form: 'bark',
  },
  // Below the default 10 g, so the Low badge shows.
  {
    id: '00000000-0000-0000-0003-000000000005',
    ingredient: fromCompendium('German Chamomile', 'Matricaria chamomilla'),
    form: 'Flower',
    quantity: '8.000',
    unit: 'g',
  },
  // A set threshold, 12 drops, where the default would be 3.
  {
    id: '00000000-0000-0000-0003-000000000006',
    ingredient: fromCompendium('German Chamomile', 'Matricaria chamomilla'),
    form: 'Oil',
    quantity: '20.000',
    unit: 'drop',
    lowStockThreshold: '12.000',
  },
];

// What the shelf below lays: W's cupboard entries and its own Hearth Ash, as
// the two jars above lay them.
const SEA_SALT = fromCompendium('Sea Salt', 'Sodium chloride');
const ROSEMARY = fromCompendium('Rosemary', 'Salvia rosmarinus');
const LAVENDER = fromCompendium('Lavender', 'Lavandula angustifolia');
const MUGWORT = fromCompendium('Mugwort', 'Artemisia vulgaris');
const CHAMOMILE = fromCompendium('German Chamomile', 'Matricaria chamomilla');
const ASH = fromWorkspace(HEARTH_ASH);

/** Fixture B, a member of W, who writes the private spells. */
const MEMBER_B = FIXTURE_USERS.B.id;
// W's content is written as a member would, so the demo's private spells are B's.
const W_COVEN = { workspaceId: WORKSPACE_W_ID, authorId: MEMBER_B };

/** The jars, fixed ids in a block of their own (`…0002-…`). */
export const DEMO_SPELLS: SeedSpell[] = [
  {
    id: '00000000-0000-0000-0002-000000000001',
    title: 'Hearth Warding Jar',
    intent: 'Keep the house and everyone asleep in it from what walks the lane at night.',
    jarDescription: '4 oz jar',
    sealWaxColor: 'Black',
    moonPhase: 'Waning Crescent',
    dayOfWeek: 'Saturday',
    note: 'Keep it upright once buried: a jar knocked over is made again, not set back.',
    status: 'complete',
    categories: ['Warding', 'Protection', 'Home Blessing'],
    // The recipe in order: layers, with instruction-only steps between them
    // and one step that is both (story 80).
    steps: [
      { body: 'Layer dry to damp, from the bottom of the jar up.' },
      {
        ingredient: fromCompendium('Sea Salt', 'Sodium chloride'),
        quantity: '30.000',
        unit: 'g',
        body: 'The base. Everything above it sits on salt.',
      },
      {
        ingredient: fromCompendium('Black Salt'),
        quantity: '1.000',
        unit: 'tbsp',
      },
      { body: 'Tamp the salts down before the next layer goes in.' },
      {
        ingredient: fromWorkspace(HEARTH_ASH),
        quantity: '1.000',
        unit: 'pinch',
        body: 'From our own grate, which is the whole point of the jar.',
      },
      {
        // The custom, one-off layer: never an `ingredients` row, and `dust` is
        // uncurated — as a member would write it.
        ingredient: { tier: 'custom', name: 'Dust from the front step', form: 'dust' },
        quantity: '1.000',
        unit: 'pinch',
        body: 'Swept from our own doorstep at dusk. Not something to go on a shelf.',
      },
      {
        ingredient: fromCompendium('Rosemary', 'Salvia rosmarinus'),
        quantity: null,
        unit: null,
        body: 'A sprig laid on top, whole, before the wax goes on.',
      },
      {
        body: 'Seal with black wax while it is still warm and bury it at the front step, upright.',
      },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000002',
    title: 'Dreaming Sachet',
    intent: 'Sleep that answers a question, and is remembered in the morning.',
    jarDescription: 'A palm-sized muslin bag',
    sealWaxColor: null,
    moonPhase: 'Full Moon',
    dayOfWeek: 'Monday',
    note: 'Empty and refill it when it stops smelling of anything.',
    status: 'draft',
    categories: ['Dream Work', 'Sleep', 'Divination'],
    steps: [
      {
        body: 'Crush the mugwort between your hands before it goes in.\n\nToo much and nobody sleeps at all.',
        ingredient: fromCompendium('Mugwort', 'Artemisia vulgaris'),
        quantity: '1.000',
        unit: 'tbsp',
      },
      {
        ingredient: fromCompendium('Lavender', 'Lavandula angustifolia'),
        quantity: '2.000',
        unit: 'tsp',
      },
      {
        ingredient: fromCompendium('German Chamomile', 'Matricaria chamomilla'),
        quantity: '2.000',
        unit: 'tsp',
      },
      {
        ingredient: fromCompendium('Amethyst', 'Quartz var. amethyst'),
        quantity: '1.000',
        unit: 'piece',
        body: 'A tumbled stone, small enough not to be felt through the pillow.',
      },
      { body: 'Stitch the bag closed and keep it inside the pillowcase.' },
    ],
  },
  // The shelf: more than a page of each status for a member, so both grimoire tabs page, with shared titles, an intent-only
  // match, an accented title, an untitled draft and four private spells of Fixture B (claude-docs/db/demo-scenario.md, "The grimoire shelf").
  {
    id: '00000000-0000-0000-0002-000000000003',
    title: 'Hearth Fire Blessing',
    intent: 'Bless the first fire of winter so the house stays warm and free of quarrels.',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: 'New Moon',
    dayOfWeek: 'Sunday',
    note: 'Light it from a match, never from another candle.',
    status: 'complete',
    categories: ['Home Blessing', 'Harmony'],
    steps: [
      { body: 'Sweep the grate clean before the first fire is laid.' },
      {
        ingredient: ASH,
        quantity: '5.000',
        unit: 'g',
        body: 'Last winter’s, scattered under the new kindling.',
      },
      { body: 'Say the blessing once the flames catch, and not before.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000004',
    title: 'Cold Hearth Cleansing',
    intent: 'Clear a room that has been shut up all season before anyone sleeps in it.',
    jarDescription: 'A saucer',
    sealWaxColor: null,
    moonPhase: 'Waning Gibbous',
    dayOfWeek: 'Saturday',
    note: null,
    status: 'complete',
    categories: ['Cleansing', 'Purification'],
    steps: [
      { body: 'Open every window in the room first.' },
      { ingredient: SEA_SALT, quantity: '15.000', unit: 'g', body: 'Heaped in the saucer.' },
      { body: 'Leave the saucer in the cold grate overnight and throw the salt out at dawn.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000005',
    title: 'Banked Hearth Candle',
    intent: 'A slow candle for the nights someone is travelling home late.',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: null,
    dayOfWeek: null,
    note: 'Snuff it, never blow it out, once they are through the door.',
    status: 'complete',
    categories: ['Safe Travel', 'Protection'],
    steps: [
      {
        ingredient: ROSEMARY,
        quantity: null,
        unit: null,
        body: 'A needle or two pressed into the wax.',
      },
      { body: 'Set it in the window that faces the road and let it burn low.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000006',
    title: 'Threshold Salt Line',
    intent: 'A line across the door that keeps the hearth, and everyone who sits by it, safe.',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: 'Waning Crescent',
    dayOfWeek: 'Saturday',
    note: 'Redraw it after anyone sweeps the step.',
    status: 'complete',
    categories: ['Warding', 'Protection'],
    steps: [
      { ingredient: SEA_SALT, quantity: '30.000', unit: 'g' },
      { body: 'Pour it in one unbroken line along the inside of the front step.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000007',
    title: 'Rosemary Remembering Oil',
    intent: 'Keep a name and a face clear in mind after someone has gone.',
    jarDescription: '1 oz bottle',
    sealWaxColor: 'White',
    moonPhase: 'Full Moon',
    dayOfWeek: 'Monday',
    note: 'Dab it on the wrist on the anniversary.',
    status: 'complete',
    categories: ['Memory', 'Ancestor Work', 'Grief Work'],
    steps: [
      { ingredient: ROSEMARY, quantity: '3.000', unit: 'piece', body: 'Sprigs, bruised first.' },
      { body: 'Cover with warm oil and leave it on the windowsill for a fortnight.' },
      { body: 'Strain into the bottle and seal it.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000008',
    title: 'Market Day Honey Jar',
    intent: 'Sweeten the buyers at the stall on a slow market day.',
    jarDescription: '2 oz jar',
    sealWaxColor: 'Gold',
    moonPhase: 'Waxing Crescent',
    dayOfWeek: 'Thursday',
    note: null,
    status: 'complete',
    categories: ['Business', 'Success'],
    steps: [
      {
        ingredient: { tier: 'custom', name: 'Heather honey', form: 'liquid' },
        quantity: '3.000',
        unit: 'tbsp',
        body: 'From the stall two along.',
      },
      { body: 'Write the stall’s name on a slip of paper and push it under the honey.' },
      { body: 'Keep the jar under the till.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000009',
    title: 'Lavender Calm Bath',
    intent: 'Unknot the shoulders after a long week.',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: null,
    dayOfWeek: 'Friday',
    note: null,
    status: 'complete',
    categories: ['Peace', 'Self-Love'],
    steps: [
      { ingredient: LAVENDER, quantity: '2.000', unit: 'tbsp', body: 'Tied in a muslin square.' },
      { body: 'Steep the bundle in the bath as it runs, and stay in until it cools.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000010',
    title: 'Blackthorn Binding Cord',
    intent: 'Stop a gossip spreading what is not theirs to spread.',
    jarDescription: null,
    sealWaxColor: 'Black',
    moonPhase: 'Waning Crescent',
    dayOfWeek: 'Saturday',
    note: 'Bury the cord far from the house.',
    status: 'complete',
    categories: ['Binding', 'Justice'],
    steps: [
      {
        ingredient: { tier: 'custom', name: 'Red wool cord', form: 'cord' },
        quantity: '1.000',
        unit: 'piece',
        body: 'An arm’s length.',
      },
      { body: 'Tie seven knots, naming what must stop at each.' },
      { body: 'Drip black wax over the last knot.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000011',
    title: 'New Moon Wishing Paper',
    intent: 'Write down one want at the new moon and let the month carry it.',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: 'New Moon',
    dayOfWeek: null,
    note: 'One wish only. Two and neither comes.',
    status: 'complete',
    categories: ['Manifestation', 'Abundance'],
    steps: [
      { body: 'Write the wish in pencil, as if it had already happened.' },
      {
        body: 'Fold the paper towards you three times and keep it under a stone until the full moon.',
      },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000012',
    title: 'Mirror Box Reversal',
    intent: 'Send back what was sent, without adding anything of our own.',
    jarDescription: 'A small tin',
    sealWaxColor: null,
    moonPhase: 'Waning Gibbous',
    dayOfWeek: 'Tuesday',
    note: null,
    status: 'complete',
    categories: ['Reversal', 'Hex-Breaking'],
    steps: [
      { body: 'Line the inside of the tin with mirror card, shiny side in.' },
      { ingredient: SEA_SALT, quantity: '1.000', unit: 'tsp' },
      { body: 'Close the lid and leave it facing the way the trouble came.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000013',
    title: 'Clear Head Charm',
    intent: 'Think straight through an exam or an interview.',
    jarDescription: 'A palm-sized muslin bag',
    sealWaxColor: null,
    moonPhase: 'First Quarter',
    dayOfWeek: 'Wednesday',
    note: 'Keep it in the left pocket.',
    status: 'complete',
    categories: ['Clarity', 'Confidence'],
    steps: [
      { ingredient: ROSEMARY, quantity: '1.000', unit: 'tsp', body: 'Dried and crumbled.' },
      { ingredient: LAVENDER, quantity: '1.000', unit: 'pinch' },
      { body: 'Tie it shut the night before.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000014',
    title: 'Steady Hands Tea',
    intent: 'Steadiness before something frightening.',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: null,
    dayOfWeek: null,
    note: null,
    status: 'complete',
    categories: ['Courage', 'Strength'],
    steps: [
      { ingredient: CHAMOMILE, quantity: '1.000', unit: 'tsp' },
      { body: 'Steep for five minutes, covered, and drink it slowly.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000015',
    title: 'Ancestor Plate',
    intent: 'Set a place for the family who came before, on the night they are remembered.',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: null,
    dayOfWeek: null,
    note: 'Whatever is left in the morning goes out to the birds.',
    status: 'complete',
    categories: ['Ancestor Work', 'Spirit Work'],
    steps: [
      { body: 'Lay the plate at the head of the table with a little of everything served.' },
      { ingredient: ROSEMARY, quantity: null, unit: null, body: 'A sprig beside the plate.' },
      { body: 'Say each name aloud before anyone eats.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000016',
    title: 'Mugwort Seeing Wash',
    intent: 'Wash the scrying bowl so it shows something worth seeing.',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: 'Full Moon',
    dayOfWeek: 'Monday',
    note: 'Never drink it.',
    status: 'complete',
    categories: ['Divination', 'Psychic Work'],
    steps: [
      { ingredient: MUGWORT, quantity: '3.000', unit: 'g' },
      { body: 'Infuse in hot water, let it cool, and wipe the bowl with it.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000017',
    title: 'Road Opener Sachet',
    intent: 'Open the way for a job search that has stalled.',
    jarDescription: 'A palm-sized muslin bag',
    sealWaxColor: null,
    moonPhase: 'Waxing Gibbous',
    dayOfWeek: 'Sunday',
    note: null,
    status: 'complete',
    categories: ['Career', 'Success'],
    steps: [
      { ingredient: ROSEMARY, quantity: '1.000', unit: 'tsp' },
      { ingredient: SEA_SALT, quantity: '1.000', unit: 'pinch' },
      { body: 'Carry it to every interview.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000018',
    title: 'Safe Passage Knot',
    intent: 'Tied for anyone setting off on a long road.',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: null,
    dayOfWeek: null,
    note: 'Untie it when they ring to say they have arrived.',
    status: 'complete',
    categories: ['Safe Travel'],
    steps: [
      { body: 'Tie one knot in a length of thread for each stop on the way.' },
      { body: 'Hang it from the inside of the front door.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000019',
    title: 'Garden Gate Blessing',
    intent: 'Bless the vegetable beds before the first planting.',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: 'Waxing Crescent',
    dayOfWeek: 'Friday',
    note: null,
    status: 'complete',
    categories: ['Fertility', 'Abundance', 'Grounding'],
    steps: [
      { ingredient: ASH, quantity: '1.000', unit: 'tbsp', body: 'Worked into the soil.' },
      { body: 'Walk the beds once clockwise, speaking to each.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000020',
    title: 'Honest Words Candle',
    intent: 'Help a hard conversation stay honest on both sides.',
    jarDescription: null,
    sealWaxColor: 'Blue',
    moonPhase: null,
    dayOfWeek: 'Wednesday',
    note: null,
    status: 'complete',
    categories: ['Communication', 'Truth', 'Reconciliation'],
    steps: [
      { ingredient: LAVENDER, quantity: '1.000', unit: 'pinch', body: 'Rolled into the wax.' },
      { body: 'Light it between the two of you and talk until it is spent.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000021',
    title: 'Grief Bowl',
    intent: 'Somewhere to set sorrow down for a while.',
    jarDescription: 'A wide bowl',
    sealWaxColor: null,
    moonPhase: 'Waning Crescent',
    dayOfWeek: null,
    note: 'Pour the water onto the earth, never down the sink.',
    status: 'complete',
    categories: ['Grief Work', 'Release', 'Healing'],
    steps: [
      { ingredient: SEA_SALT, quantity: '1.000', unit: 'tsp', body: 'Stirred into cool water.' },
      { body: 'Speak into the bowl until there is nothing left to say.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000022',
    title: 'Friendship Braid',
    intent: 'Hold a friendship that distance keeps testing.',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: 'Full Moon',
    dayOfWeek: 'Friday',
    note: 'Make two and post one.',
    status: 'complete',
    categories: ['Friendship', 'Fidelity'],
    steps: [
      { body: 'Braid three threads, one for each of you and one for the friendship.' },
      { ingredient: LAVENDER, quantity: null, unit: null, body: 'A sprig worked into the end.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000023',
    title: 'Rainwater Renewal Rite',
    intent: 'Begin again after a long illness.',
    jarDescription: '8 oz jar',
    sealWaxColor: null,
    moonPhase: 'New Moon',
    dayOfWeek: 'Sunday',
    note: null,
    status: 'complete',
    categories: ['Healing', 'Transformation', 'Longevity'],
    steps: [
      { body: 'Collect the first rain after the new moon in a clean jar.' },
      {
        ingredient: ROSEMARY,
        quantity: '1.000',
        unit: 'piece',
        body: 'One sprig, left in overnight.',
      },
      { body: 'Wash the hands and face with it at sunrise.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000024',
    title: 'Bright Muse Candle',
    intent: 'Find the words for a song that will not come.',
    jarDescription: null,
    sealWaxColor: 'Yellow',
    moonPhase: 'Waxing Gibbous',
    dayOfWeek: 'Wednesday',
    note: null,
    status: 'complete',
    categories: ['Creativity', 'Inspiration'],
    steps: [
      { body: 'Write the first line you have on the candle with a pin.' },
      { body: 'Burn it while you work, and stop when it does.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000025',
    title: 'Nightmare Net',
    intent: 'Keep bad dreams away from a child’s bed.',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: null,
    dayOfWeek: 'Monday',
    note: 'Shake it out of the window once a week.',
    status: 'complete',
    categories: ['Nightmare Protection', 'Sleep'],
    steps: [
      { body: 'Weave a net of white thread across a willow hoop.' },
      { ingredient: LAVENDER, quantity: '1.000', unit: 'pinch', body: 'Tucked into the knots.' },
      { body: 'Hang it above the headboard.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000026',
    title: 'Familiar’s Collar Charm',
    intent: 'Keep the cat safe on her night walks.',
    jarDescription: 'A thimble-sized pouch',
    sealWaxColor: null,
    moonPhase: null,
    dayOfWeek: null,
    note: null,
    status: 'complete',
    categories: ['Familiar Work', 'Protection'],
    steps: [
      { ingredient: SEA_SALT, quantity: '1.000', unit: 'pinch' },
      { body: 'Stitch the pouch to the inside of the collar, where she cannot chew it.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000027',
    title: 'Full Moon Stillness',
    intent: 'Sit still for a whole hour, and want to.',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: 'Full Moon',
    dayOfWeek: null,
    note: null,
    status: 'complete',
    categories: ['Meditation', 'Peace'],
    steps: [
      { ingredient: CHAMOMILE, quantity: '1.000', unit: 'tsp', body: 'As a tea, beforehand.' },
      { body: 'Sit where the moonlight reaches and count breaths back from a hundred.' },
    ],
  },
  // The drafts.
  {
    id: '00000000-0000-0000-0002-000000000028',
    title: 'Hearthstone Luck Charm',
    intent: 'Luck at cards, kept warm by the hearthstone.',
    jarDescription: null,
    sealWaxColor: 'Green',
    moonPhase: 'Waxing Crescent',
    dayOfWeek: 'Thursday',
    note: 'Not sure about the day yet.',
    status: 'draft',
    categories: ['Gambling', 'Prosperity'],
    steps: [{ body: 'Keep a coin on the hearthstone for three nights.' }],
  },
  {
    id: '00000000-0000-0000-0002-000000000029',
    title: 'Rêverie Pillow Mist',
    intent: 'A softer sleep and gentler dreams.',
    jarDescription: '2 oz spray bottle',
    sealWaxColor: null,
    moonPhase: null,
    dayOfWeek: 'Monday',
    note: null,
    status: 'draft',
    categories: ['Sleep', 'Dream Work'],
    steps: [
      {
        ingredient: LAVENDER,
        quantity: '1.000',
        unit: 'tbsp',
        body: 'Steeped in the water first.',
      },
      { body: 'Mist the pillow once, from arm’s length.' },
    ],
  },
  {
    // Untitled: a draft may be, a complete spell may not.
    id: '00000000-0000-0000-0002-000000000030',
    title: null,
    intent: 'Something for the new neighbours. Not sure what yet.',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: null,
    dayOfWeek: null,
    note: null,
    status: 'draft',
    categories: [],
    steps: [{ body: 'Ask them what they would like first.' }],
  },
  {
    id: '00000000-0000-0000-0002-000000000031',
    title: 'Crossroads Choosing Jar',
    intent: 'Choose well between two roads.',
    jarDescription: '4 oz jar',
    sealWaxColor: null,
    moonPhase: 'Dark',
    dayOfWeek: 'Saturday',
    note: null,
    status: 'draft',
    categories: ['Wisdom', 'Intuition'],
    steps: [
      { body: 'Write each choice on its own slip and fold both the same way.' },
      { ingredient: MUGWORT, quantity: '1.000', unit: 'pinch' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000032',
    title: 'Solstice Sun Wheel',
    intent: 'Welcome the light back at midwinter.',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: null,
    dayOfWeek: null,
    note: null,
    status: 'draft',
    categories: ['Joy', 'Home Blessing'],
    steps: [
      { body: 'Bend a willow ring and bind it with eight spokes of straw.' },
      { ingredient: ROSEMARY, quantity: null, unit: null, body: 'Woven through the spokes.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000033',
    title: 'Glimmer Powder',
    intent: 'Be noticed in a crowded room.',
    jarDescription: 'A small tin',
    sealWaxColor: null,
    moonPhase: 'Full Moon',
    dayOfWeek: 'Friday',
    note: null,
    status: 'draft',
    categories: ['Glamour', 'Attraction'],
    steps: [{ body: 'Grind it fine and dust a little on the collarbones.' }],
  },
  {
    id: '00000000-0000-0000-0002-000000000034',
    title: 'Landlord Sweetening Jar',
    intent: 'Soften the landlord before the lease comes up.',
    jarDescription: '2 oz jar',
    sealWaxColor: 'Pink',
    moonPhase: null,
    dayOfWeek: 'Thursday',
    note: null,
    status: 'draft',
    categories: ['Legal Matters', 'Harmony'],
    steps: [
      {
        ingredient: { tier: 'custom', name: 'Brown sugar', form: 'granules' },
        quantity: '2.000',
        unit: 'tbsp',
      },
      { body: 'Write the address on the lid.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000035',
    title: 'Shadow Journal Rite',
    intent: 'Meet the parts of yourself you would rather not.',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: 'Dark Moon',
    dayOfWeek: null,
    note: null,
    status: 'draft',
    categories: ['Shadow Work', 'Truth'],
    steps: [{ body: 'Write for ten minutes without lifting the pen, then read it aloud.' }],
  },
  {
    id: '00000000-0000-0000-0002-000000000036',
    title: 'Forgiveness Water',
    intent: 'Let go of an old grudge.',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: 'Waning Gibbous',
    dayOfWeek: null,
    note: null,
    status: 'draft',
    categories: ['Forgiveness', 'Release'],
    steps: [
      { ingredient: CHAMOMILE, quantity: '1.000', unit: 'tsp' },
      { body: 'Pour it into running water and do not watch it go.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000037',
    title: 'House Spirit Bell',
    intent: 'Call the house spirit back to the hearth after a move.',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: null,
    dayOfWeek: null,
    note: 'Need a proper bell; the shop one rings flat.',
    status: 'draft',
    categories: ['Spirit Work', 'Home Blessing'],
    steps: [{ body: 'Ring the bell in each room, ending by the fire.' }],
  },
  {
    id: '00000000-0000-0000-0002-000000000038',
    title: 'Rent Coin Jar',
    intent: 'Cover the rent this month.',
    jarDescription: '8 oz jar',
    sealWaxColor: 'Green',
    moonPhase: 'Waxing Gibbous',
    dayOfWeek: 'Thursday',
    note: null,
    status: 'draft',
    categories: ['Wealth', 'Prosperity'],
    steps: [
      { body: 'Drop a coin in every day until the rent is due.' },
      { ingredient: SEA_SALT, quantity: '1.000', unit: 'pinch', body: 'Under the first coin.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000039',
    title: 'Rose Attraction Oil',
    intent: 'Draw a new love, and a kind one.',
    jarDescription: '1 oz bottle',
    sealWaxColor: 'Red',
    moonPhase: 'Waxing Crescent',
    dayOfWeek: 'Friday',
    note: null,
    status: 'draft',
    categories: ['Love', 'Attraction'],
    steps: [
      {
        ingredient: { tier: 'custom', name: 'Dried rose petals', form: 'petals' },
        quantity: '1.000',
        unit: 'tbsp',
      },
      { body: 'Cover with oil and leave it a full moon cycle.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000040',
    title: 'Mirror Kindness Rite',
    intent: 'Look in the mirror and like what looks back.',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: null,
    dayOfWeek: 'Friday',
    note: null,
    status: 'draft',
    categories: ['Self-Love', 'Confidence'],
    steps: [{ body: 'Say three true, kind things to the mirror each morning for a week.' }],
  },
  {
    id: '00000000-0000-0000-0002-000000000041',
    title: 'Banishing Floor Wash',
    intent: 'Clear the last tenant’s leavings out of the flat.',
    jarDescription: 'A bucket',
    sealWaxColor: null,
    moonPhase: 'Waning Crescent',
    dayOfWeek: 'Saturday',
    note: null,
    status: 'draft',
    categories: ['Banishing', 'Cleansing'],
    steps: [
      { ingredient: SEA_SALT, quantity: '3.000', unit: 'tbsp' },
      { body: 'Wash from the back of the flat towards the front door, and out.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000042',
    title: 'Plain Truth Tea',
    intent: 'Get a straight answer out of yourself.',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: null,
    dayOfWeek: null,
    note: null,
    status: 'draft',
    categories: ['Truth', 'Clarity'],
    steps: [{ ingredient: ROSEMARY, quantity: '1.000', unit: 'tsp' }],
  },
  {
    id: '00000000-0000-0000-0002-000000000043',
    title: 'Uncrossing Bath',
    intent: 'Lift a run of bad luck.',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: 'Waning Gibbous',
    dayOfWeek: 'Sunday',
    note: null,
    status: 'draft',
    categories: ['Uncrossing', 'Purification'],
    steps: [
      { ingredient: SEA_SALT, quantity: '1.000', unit: 'cup' },
      { body: 'Pour the bathwater over the head, from the crown down, seven times.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000044',
    title: 'Samhain Smoke Reading',
    intent: 'Read the smoke on Samhain night.',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: null,
    dayOfWeek: null,
    note: 'Outside only.',
    status: 'draft',
    categories: ['Prophecy', 'Divination'],
    steps: [
      { ingredient: MUGWORT, quantity: '1.000', unit: 'tbsp', body: 'Dried, on charcoal.' },
      { body: 'Watch which way the smoke leans, and write it down at once.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000045',
    title: 'Study Candle',
    intent: 'Learn a new language faster.',
    jarDescription: null,
    sealWaxColor: 'Orange',
    moonPhase: 'First Quarter',
    dayOfWeek: 'Wednesday',
    note: null,
    status: 'draft',
    categories: ['Knowledge', 'Memory'],
    steps: [{ body: 'Light it at the start of every lesson.' }],
  },
  {
    id: '00000000-0000-0000-0002-000000000046',
    title: 'Business Card Blessing',
    intent: 'Bless new business cards before handing any out.',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: 'Waxing Crescent',
    dayOfWeek: 'Wednesday',
    note: null,
    status: 'draft',
    categories: ['Business', 'Communication'],
    steps: [{ body: 'Pass the stack through rosemary smoke three times.' }],
  },
  {
    id: '00000000-0000-0000-0002-000000000047',
    title: 'Sisters’ Mending Cord',
    intent: 'Mend a quarrel between sisters.',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: 'Full Moon',
    dayOfWeek: 'Friday',
    note: null,
    status: 'draft',
    categories: ['Reconciliation', 'Love'],
    steps: [{ body: 'Knot two threads together in the middle and keep the knot in a drawer.' }],
  },
  {
    id: '00000000-0000-0000-0002-000000000048',
    title: 'Long Recovery Stone',
    intent: 'Carry someone through a long recovery.',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: null,
    dayOfWeek: 'Sunday',
    note: null,
    status: 'draft',
    categories: ['Strength', 'Healing'],
    steps: [{ body: 'Find a smooth stone by water and hold it while you sit with them.' }],
  },
  {
    id: '00000000-0000-0000-0002-000000000049',
    title: 'Moving Day Ward',
    intent: 'Ward a new home before the first box comes through the door.',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: null,
    dayOfWeek: null,
    note: null,
    status: 'draft',
    categories: ['Warding', 'Home Blessing'],
    steps: [
      {
        ingredient: SEA_SALT,
        quantity: '1.000',
        unit: 'pinch',
        body: 'In each corner of each room.',
      },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000050',
    title: 'Winter Broth Blessing',
    intent: 'A blessing on the winter broth, for everyone who eats it.',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: null,
    dayOfWeek: null,
    note: null,
    status: 'draft',
    categories: ['Longevity', 'Healing'],
    steps: [
      { ingredient: ROSEMARY, quantity: '2.000', unit: 'piece', body: 'Sprigs.' },
      { body: 'Stir clockwise, and say what you wish for each person at the table.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000051',
    title: 'Old Year Ash Rite',
    intent: 'Burn the old year away on the last night of it.',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: null,
    dayOfWeek: null,
    note: null,
    status: 'draft',
    categories: ['Transformation', 'Release'],
    steps: [
      { body: 'Write what is done with on paper, and burn it.' },
      { ingredient: ASH, quantity: '1.000', unit: 'pinch', body: 'Mixed with the new ash.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000052',
    title: 'Calm Commute Charm',
    intent: 'Keep the morning train from fraying anyone.',
    jarDescription: 'A thimble-sized pouch',
    sealWaxColor: null,
    moonPhase: null,
    dayOfWeek: 'Monday',
    note: null,
    status: 'draft',
    categories: ['Peace', 'Safe Travel'],
    steps: [{ ingredient: CHAMOMILE, quantity: '1.000', unit: 'pinch' }],
  },
  // Fixture B's own, private: another member never reads them, a search
  // that matches them included.
  {
    id: '00000000-0000-0000-0002-000000000053',
    title: 'Private Hearth Vow',
    intent: 'A promise kept between me and the fire.',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: 'New Moon',
    dayOfWeek: null,
    note: null,
    status: 'complete',
    visibility: 'private',
    byAuthor: true,
    categories: ['Fidelity'],
    steps: [{ body: 'Say it to the embers, once, and never write it down.' }],
  },
  {
    id: '00000000-0000-0000-0002-000000000054',
    title: 'Quiet Nerves Jar',
    intent: 'Settle my own nerves before the hearing.',
    jarDescription: '2 oz jar',
    sealWaxColor: 'Blue',
    moonPhase: null,
    dayOfWeek: 'Tuesday',
    note: null,
    status: 'complete',
    visibility: 'private',
    byAuthor: true,
    categories: ['Peace', 'Legal Matters'],
    steps: [
      { ingredient: CHAMOMILE, quantity: '1.000', unit: 'tbsp' },
      { body: 'Hold the jar in both hands for a minute before going in.' },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000055',
    title: 'Hearth Ward of My Own',
    intent: 'My own ward, not ready to share.',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: null,
    dayOfWeek: null,
    note: null,
    status: 'draft',
    visibility: 'private',
    byAuthor: true,
    categories: ['Warding'],
    steps: [{ body: 'Work out what goes in it.' }],
  },
  {
    id: '00000000-0000-0000-0002-000000000056',
    title: 'Letter to the Sea',
    intent: 'Say goodbye to my grandmother.',
    jarDescription: null,
    sealWaxColor: null,
    moonPhase: 'Waning Crescent',
    dayOfWeek: null,
    note: null,
    status: 'draft',
    visibility: 'private',
    byAuthor: true,
    categories: ['Grief Work', 'Release'],
    steps: [{ body: 'Write the letter, fold it into a boat, and let the tide take it.' }],
  },
];

export async function seedDemo(db: SeedDatabase): Promise<void> {
  // Before the transaction opens, as seedCompendium does: an invalid file writes nothing.
  assertCompendiumValid(CURATED_FILES);
  await beginSeedTransaction(db, async (tx) => {
    // Inside the same transaction: every spell points at rows `standard` writes.
    // A deity pick someone deleted stays deleted, as a spell does.
    await seedStandardContent(tx, { restoreDeletedDeityPicks: false });
    // The curated compendium, after standard so its fixture entries keep their
    // rows and a curated entry of the same identity is skipped. Demo is for a
    // person exploring the app; standard stays the test fixture cast
    // (claude-docs/db/demo-scenario.md).
    await seedCompendiumContent(tx, CURATED_FILES);
    // Reference data on every environment, so the scenario shows it too; `standard` leaves it out.
    await seedDemoCovenSeats(tx);
    await seedDemoCovenContent(tx);

    await insertMissingWorkspaceIngredients(tx, W_COVEN, WORKSPACE_W_INGREDIENTS);
    const own = await workspaceIngredientIds(tx, W_COVEN, WORKSPACE_W_INGREDIENTS);
    // W's entries' slugs and forms; the compendium's `standard` wrote already.
    await reslugIngredients(tx, [...own.values()]);
    await insertMissingVariants(
      tx,
      WORKSPACE_W_INGREDIENTS.flatMap((entry) => {
        const ingredientId = own.get(identityOf(entry));
        return ingredientId ? [{ ingredientId, variants: entry.variants }] : [];
      }),
    );
    await insertMissingCupboardEntries(tx, W_COVEN, WORKSPACE_W_CUPBOARD);
    await seedDemoSpells(tx);
    await insertMissingStock(tx, W_COVEN, DEMO_STOCK, await ingredientIdByIdentity(tx, W_COVEN));
    // After the stock: a complete working has already taken from the jars.
    await insertMissingWorkings(tx, DEMO_WORKINGS);
    // Fake invitation cards and refused opens, for the admin card tabs; the fixture users exist by now.
    await seedInvitationCards(tx);
    // Fake support requests, replies and time-outs, for the admin Support tab and the account's own requests.
    await seedSupportRequests(tx);
  });
}

/**
 * W's grimoire alone: the spells missing by id, then their steps and
 * categories. Its own export so a database the scenario already seeded can
 * take spells added since, writing nothing else.
 */
export async function seedDemoSpells(tx: SeedTransaction): Promise<void> {
  await insertMissingSpells(tx, W_COVEN, DEMO_SPELLS);
  await insertMissingSteps(
    tx,
    DEMO_SPELLS,
    await ingredientIdByIdentity(tx, W_COVEN),
    await variantIdByIngredient(tx),
  );
  await insertMissingSpellCategories(tx, DEMO_SPELLS, await categoryIdByName(tx));
}
