import { and, eq, inArray, isNull } from 'drizzle-orm';
import { BOOTSTRAP_USER_ID, DEMO_WORKSPACE_ID } from '../bootstrap';
import { ingredientVariants } from '../../modules/ingredients/schema/ingredient-variants';
import { workspaces } from '../../modules/coven/schema/workspaces';
import { categoryIdByName } from './categories';
import {
  identityOf,
  ingredientIdByIdentity,
  insertMissingCupboardEntries,
  insertMissingSpellCategories,
  insertMissingSpells,
  insertMissingSteps,
  insertMissingStock,
  insertMissingVariants,
  insertMissingWorkings,
  insertMissingWorkspaceIngredients,
  tierKey,
  variantIdByIngredient,
  workspaceIngredientIds,
} from './coven-content';
import type {
  CovenTarget,
  NamedIngredient,
  SeedCupboardEntry,
  SeedLayerIngredient,
  SeedSpell,
  SeedStock,
  SeedTransaction,
  SeedWorking,
  SeedWorkspaceIngredient,
} from './types';

// The demo coven's cupboard, jars, spells and workings, written against the real compendium (the approved files under
// `compendium/`), never the `standard` fixtures. Each compendium ingredient is named by its formal name and a form its file
// lists. Additive, as the helpers are: a row that exists is left as it is, so an admin's hand edit stands. An entry the
// environment's compendium lacks is skipped and reported, never an error (claude-docs/db/demo-coven-seed.md, "Contents").

const COVEN: CovenTarget = { workspaceId: DEMO_WORKSPACE_ID, authorId: BOOTSTRAP_USER_ID };

const BAY_LAUREL = {
  tier: 'compendium',
  entry: { name: 'Bay Laurel', canonicalName: 'Laurus nobilis' },
} as const satisfies NamedIngredient;
const SALT = {
  tier: 'compendium',
  entry: { name: 'Salt', canonicalName: 'Sodium chloride' },
} as const satisfies NamedIngredient;
const LAVENDER = {
  tier: 'compendium',
  entry: { name: 'Lavender', canonicalName: 'Lavandula angustifolia' },
} as const satisfies NamedIngredient;
const BASIL = {
  tier: 'compendium',
  entry: { name: 'Basil', canonicalName: 'Ocimum basilicum' },
} as const satisfies NamedIngredient;
const CINNAMON = {
  tier: 'compendium',
  entry: { name: 'Cinnamon', canonicalName: 'Cinnamomum verum' },
} as const satisfies NamedIngredient;
const CHAMOMILE = {
  tier: 'compendium',
  entry: { name: 'German Chamomile', canonicalName: 'Matricaria chamomilla' },
} as const satisfies NamedIngredient;
const HYSSOP = {
  tier: 'compendium',
  entry: { name: 'Hyssop', canonicalName: 'Hyssopus officinalis' },
} as const satisfies NamedIngredient;

/** The coven's own entry: invented, with no formal name and so no correspondences. */
const HOUSE_BLEND: SeedWorkspaceIngredient = {
  name: 'House Hearth Blend',
  nomenclature: 'none',
  description: 'A dried mix the coven makes up for itself and keeps in a tin on the shelf.',
  variants: [{ form: 'blend' }],
};
const OWN_HOUSE_BLEND = {
  tier: 'workspace',
  entry: HOUSE_BLEND,
} as const satisfies NamedIngredient;

/** The compendium entries the coven holds: seven, annotated with nothing. */
export const DEMO_COVEN_CUPBOARD: SeedCupboardEntry[] = [
  BAY_LAUREL,
  SALT,
  LAVENDER,
  BASIL,
  CINNAMON,
  CHAMOMILE,
  HYSSOP,
].map(({ entry }) => ({ entry }));

export const DEMO_COVEN_OWN_ENTRIES: SeedWorkspaceIngredient[] = [HOUSE_BLEND];

const jar = (n: number) => `00000000-0000-0000-0103-${String(n).padStart(12, '0')}`;
const SALT_JAR = jar(1);
const LAUREL_JAR = jar(2);
const HYSSOP_JAR = jar(3);
const LAVENDER_JAR = jar(4);
const BASIL_JAR = jar(5);
const BLEND_JAR = jar(6);

/**
 * Six jars, on most of the entries: Cinnamon and German Chamomile have none. Each names the form a linked layer of that
 * entry lays (the first form alphabetically, as `variantIdByIngredient` picks it), so a step and its jar agree.
 */
export const DEMO_COVEN_STOCK: SeedStock[] = [
  { id: SALT_JAR, ingredient: SALT, form: 'Salt', quantity: '500.000', unit: 'g' },
  { id: LAUREL_JAR, ingredient: BAY_LAUREL, form: 'Leaf', quantity: '40.000', unit: 'g' },
  { id: HYSSOP_JAR, ingredient: HYSSOP, form: 'Herb', quantity: '30.000', unit: 'g' },
  { id: LAVENDER_JAR, ingredient: LAVENDER, form: 'Flower', quantity: '60.000', unit: 'g' },
  { id: BASIL_JAR, ingredient: BASIL, form: 'Leaf', quantity: '50.000', unit: 'g' },
  { id: BLEND_JAR, ingredient: OWN_HOUSE_BLEND, form: 'blend', quantity: '100.000', unit: 'g' },
];

const spell = (n: number) => `00000000-0000-0000-0102-${String(n).padStart(12, '0')}`;
const DOORWAY_JAR = spell(1);
const CLEANSING_BOWL = spell(2);
const PROSPERITY_BOWL = spell(3);
const SLEEP_SACHET = spell(4);
const PEACE_BOWL = spell(5);

/**
 * Five spells. Every compendium ingredient carries a category the spell's assigned categories name, bar the exceptions
 * below; the test reads both. A step says what to do and claims nothing the compendium does not.
 */
export const DEMO_COVEN_SPELLS: SeedSpell[] = [
  {
    id: DOORWAY_JAR,
    title: 'Doorway Protection Jar',
    intent: 'A jar for the doorway, layered from salt, bay laurel, hyssop and the house blend.',
    jarDescription: '4 oz jar',
    status: 'complete',
    visibility: 'workspace',
    categories: ['Protection', 'Warding'],
    steps: [
      { body: 'Start with a clean, dry jar.' },
      { ingredient: SALT, quantity: '30.000', unit: 'g', body: 'The base layer.' },
      { ingredient: BAY_LAUREL, quantity: '2.000', unit: 'g' },
      { ingredient: HYSSOP, quantity: '2.000', unit: 'g' },
      { ingredient: OWN_HOUSE_BLEND, quantity: '5.000', unit: 'g' },
      { body: 'Close the jar and set it by the door.' },
    ],
  },
  {
    id: CLEANSING_BOWL,
    title: 'Cleansing Salt Bowl',
    intent: 'A dry bowl of salt, hyssop and lavender to clear a room.',
    status: 'complete',
    visibility: 'workspace',
    categories: ['Cleansing', 'Purification'],
    steps: [
      { ingredient: SALT, quantity: '20.000', unit: 'g' },
      { ingredient: HYSSOP, quantity: '1.000', unit: 'g' },
      { ingredient: LAVENDER, quantity: '1.000', unit: 'g' },
      { body: 'Mix them in a dry bowl and set the bowl in the room.' },
    ],
  },
  {
    id: PROSPERITY_BOWL,
    title: 'Prosperity Bowl',
    intent: 'A bowl of basil, cinnamon and bay laurel for the start of a venture.',
    status: 'complete',
    visibility: 'private',
    categories: ['Prosperity', 'Success'],
    steps: [
      { ingredient: BASIL, quantity: '3.000', unit: 'g' },
      { ingredient: CINNAMON, quantity: '2.000', unit: 'g' },
      { ingredient: BAY_LAUREL, quantity: '1.000', unit: 'g' },
      { ingredient: LAVENDER, quantity: '1.000', unit: 'g', body: 'Scatter the flowers on top.' },
      { body: 'Keep the bowl where you plan the work.' },
    ],
  },
  {
    id: SLEEP_SACHET,
    title: 'Sleep Sachet',
    intent: 'A small bag of lavender and chamomile for the bedside.',
    jarDescription: 'A palm-sized muslin bag',
    status: 'draft',
    visibility: 'private',
    categories: ['Sleep', 'Dream Work'],
    steps: [
      { ingredient: LAVENDER, quantity: '2.000', unit: 'g' },
      { ingredient: CHAMOMILE, quantity: '2.000', unit: 'g' },
      { body: 'Fill the bag and stitch it closed.' },
    ],
  },
  {
    id: PEACE_BOWL,
    title: 'Peace for the Table',
    intent: 'A bowl of chamomile, lavender and hyssop for the room where the household eats.',
    status: 'draft',
    visibility: 'workspace',
    categories: ['Peace', 'Harmony'],
    steps: [
      { ingredient: CHAMOMILE, quantity: '2.000', unit: 'g' },
      { ingredient: LAVENDER, quantity: '2.000', unit: 'g' },
      { ingredient: HYSSOP, quantity: '1.000', unit: 'g' },
      { body: 'Mix them in a bowl and set it on the table.' },
    ],
  },
];

/**
 * The ingredients a spell carries that match none of its assigned categories, chosen on purpose and at most two. The
 * Prosperity Bowl's lavender is one: the compendium lists lavender under neither Prosperity nor Success, so the bowl's
 * derived categories (the union of its ingredients') run wider than the two it intends, which is what the spell page shows
 * when the two kinds of category differ. The test reads this list and refuses a third.
 */
export const DEMO_COVEN_EXCEPTIONS: readonly {
  spellId: string;
  ingredient: string;
  reason: string;
}[] = [
  {
    spellId: PROSPERITY_BOWL,
    ingredient: 'Lavandula angustifolia',
    reason:
      'Lavender is listed under neither Prosperity nor Success, so the bowl shows assigned categories narrower than its derived ones.',
  },
];

const working = (n: number) => `00000000-0000-0000-0104-${String(n).padStart(12, '0')}`;

/**
 * Two workings: a complete one on the Doorway Protection Jar that took its four layers from the jars, and a draft on the
 * Cleansing Salt Bowl that took nothing. Each deduction is the step's own amount, as the working service would plan it.
 */
export const DEMO_COVEN_WORKINGS: SeedWorking[] = [
  {
    id: working(1),
    spellId: DOORWAY_JAR,
    recorder: BOOTSTRAP_USER_ID,
    status: 'complete',
    workedOn: '2026-10-01',
    note: null,
    visibility: 'workspace',
    participants: [],
    deductions: [
      { stepPosition: 2, jarId: SALT_JAR, quantity: '30.000', unit: 'g', shortfall: '0.000' },
      { stepPosition: 3, jarId: LAUREL_JAR, quantity: '2.000', unit: 'g', shortfall: '0.000' },
      { stepPosition: 4, jarId: HYSSOP_JAR, quantity: '2.000', unit: 'g', shortfall: '0.000' },
      { stepPosition: 5, jarId: BLEND_JAR, quantity: '5.000', unit: 'g', shortfall: '0.000' },
    ],
  },
  {
    id: working(2),
    spellId: CLEANSING_BOWL,
    recorder: BOOTSTRAP_USER_ID,
    status: 'draft',
    workedOn: '2026-10-15',
    note: null,
    visibility: 'private',
    participants: [],
    deductions: [],
  },
];

export interface DemoCovenContent {
  cupboard: SeedCupboardEntry[];
  ownEntries: SeedWorkspaceIngredient[];
  stock: SeedStock[];
  spells: SeedSpell[];
  workings: SeedWorking[];
}

export const DEMO_COVEN_CONTENT: DemoCovenContent = {
  cupboard: DEMO_COVEN_CUPBOARD,
  ownEntries: DEMO_COVEN_OWN_ENTRIES,
  stock: DEMO_COVEN_STOCK,
  spells: DEMO_COVEN_SPELLS,
  workings: DEMO_COVEN_WORKINGS,
};

/** One thing the run left out, and why: `what` is a formal name for an entry, or `spell "Title"`. */
export interface SkippedContent {
  what: string;
  reason: string;
}

export interface DemoCovenContentReport {
  skipped: SkippedContent[];
}

/**
 * The report's lines, one per skip, in the shape `report.ts` prints so the deploy's summary step picks them up
 * (`SKIPPED <what>: <reason>`).
 */
export function formatContentReport(report: DemoCovenContentReport): string {
  return report.skipped.map(({ what, reason }) => `SKIPPED ${what}: ${reason}`).join('\n');
}

const compendiumNames = (content: DemoCovenContent): NamedIngredient[] => {
  const named = [
    ...content.stock.map((jar) => jar.ingredient),
    ...content.spells.flatMap((item) =>
      item.steps.flatMap((step) =>
        step.ingredient?.tier === 'compendium' ? [step.ingredient] : [],
      ),
    ),
    ...content.cupboard.map(({ entry }) => ({ tier: 'compendium' as const, entry })),
  ];
  return named.filter(
    (ingredient): ingredient is NamedIngredient => ingredient.tier === 'compendium',
  );
};

/**
 * Writes the demo coven's contents in the caller's transaction. Does nothing when the demo coven is not live. A compendium
 * entry the database lacks, or lacks a form a jar names, is skipped with every jar, spell and working that depends on it, and
 * listed in the report; nothing is thrown.
 */
export async function seedDemoCovenContent(
  tx: SeedTransaction,
  content: DemoCovenContent = DEMO_COVEN_CONTENT,
): Promise<DemoCovenContentReport> {
  const report: DemoCovenContentReport = { skipped: [] };
  const [live] = await tx
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(and(eq(workspaces.id, COVEN.workspaceId), isNull(workspaces.deletedAt)));
  if (!live) return report;

  const present = await ingredientIdByIdentity(tx, COVEN);
  const idOf = (ingredient: NamedIngredient) =>
    present.get(tierKey('compendium', identityOf(ingredient.entry)));
  const named = compendiumNames(content);

  const formsOf = new Map<string, Set<string>>();
  const ids = [...new Set(named.flatMap((ingredient) => idOf(ingredient) ?? []))];
  if (ids.length > 0) {
    const variants = await tx
      .select({ ingredientId: ingredientVariants.ingredientId, form: ingredientVariants.form })
      .from(ingredientVariants)
      .where(
        and(inArray(ingredientVariants.ingredientId, ids), isNull(ingredientVariants.deletedAt)),
      );
    for (const { ingredientId, form } of variants) {
      formsOf.set(ingredientId, (formsOf.get(ingredientId) ?? new Set()).add(form.toLowerCase()));
    }
  }

  // Unusable: not in the database, or without a form a jar of it names.
  const unusable = new Map<string, string>();
  for (const ingredient of named) {
    const identity = identityOf(ingredient.entry);
    const id = idOf(ingredient);
    if (unusable.has(identity)) continue;
    if (id === undefined) {
      unusable.set(identity, "not in this environment's compendium");
      continue;
    }
    for (const jarOfIt of content.stock) {
      if (jarOfIt.ingredient.tier !== 'compendium') continue;
      if (identityOf(jarOfIt.ingredient.entry) !== identity) continue;
      if (!formsOf.get(id)?.has(jarOfIt.form.toLowerCase())) {
        unusable.set(identity, `has no "${jarOfIt.form}" form in this environment's compendium`);
      }
    }
  }
  const isUsable = (ingredient: SeedLayerIngredient) =>
    ingredient.tier !== 'compendium' || !unusable.has(identityOf(ingredient.entry));

  for (const [identity, reason] of unusable) {
    const entry = named.find((ingredient) => identityOf(ingredient.entry) === identity)!.entry;
    report.skipped.push({ what: entry.canonicalName ?? entry.name, reason });
  }

  const spells = content.spells.filter((item) => {
    const blocker = item.steps.find((step) => step.ingredient && !isUsable(step.ingredient));
    if (!blocker?.ingredient || blocker.ingredient.tier === 'custom') return true;
    const { entry } = blocker.ingredient;
    report.skipped.push({
      what: `spell "${item.title}"`,
      reason: `names ${entry.canonicalName ?? entry.name}, which is skipped`,
    });
    return false;
  });
  const kept = new Set(spells.map((item) => item.id));
  const workings = content.workings.filter((item) => kept.has(item.spellId));
  const stock = content.stock.filter((item) => isUsable(item.ingredient));
  const cupboard = content.cupboard.filter(({ entry }) => isUsable({ tier: 'compendium', entry }));

  await insertMissingWorkspaceIngredients(tx, COVEN, content.ownEntries);
  const own = await workspaceIngredientIds(tx, COVEN, content.ownEntries);
  await insertMissingVariants(
    tx,
    content.ownEntries.flatMap((entry) => {
      const ingredientId = own.get(identityOf(entry));
      return ingredientId ? [{ ingredientId, variants: entry.variants }] : [];
    }),
  );
  await insertMissingCupboardEntries(tx, COVEN, cupboard);
  const ingredientIds = await ingredientIdByIdentity(tx, COVEN);
  await insertMissingStock(tx, COVEN, stock, ingredientIds);
  await insertMissingSpells(tx, COVEN, spells);
  await insertMissingSteps(tx, spells, ingredientIds, await variantIdByIngredient(tx));
  await insertMissingSpellCategories(tx, spells, await categoryIdByName(tx));
  await insertMissingWorkings(tx, workings);
  return report;
}
