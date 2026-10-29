import { and, eq, inArray, isNull, max, ne, or } from 'drizzle-orm';
import { applyAudit } from '../audit';
import { BOOTSTRAP_SESSION } from './bootstrap-admin';
import { users } from '../../modules/identity/schema/users';
import { workspaceMembers, workspaces } from '../../modules/coven/schema/workspaces';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import { workspaceCompendiumEntries } from '../../modules/ingredients/schema/workspace-compendium-entries';
import { ingredientDeities } from '../../modules/ingredients/schema/ingredient-deities';
import { ingredientFolkNames } from '../../modules/ingredients/schema/ingredient-folk-names';
import { ingredientCategories } from '../../modules/ingredients/schema/ingredient-categories';
import { ingredientVariants } from '../../modules/ingredients/schema/ingredient-variants';
import { inventoryItems } from '../../modules/ingredients/schema/inventory-items';
import { type Unit, dimensionOf } from '../../modules/ingredients/schema/units';
import { defaultThreshold } from '../../modules/ingredients/validation/default-threshold';
import { retiredIngredientSlugs } from '../../modules/ingredients/schema/retired-ingredient-slugs';
import { deities } from '../../modules/vocabulary/schema/deities';
import { ingredientForms } from '../../modules/vocabulary/schema/ingredient-forms';
import { ingredientSlug, slugify } from '../../lib/slugify';
import { categoryIdByName, seedCategoryVocabulary } from './categories';
import { seedAstrologyVocabularies } from './astrology';
import { seedDeityVocabulary } from './deities';
import { seedVocabularySources } from './sources';
import { seedFormVocabulary } from './forms';
import {
  beginSeedTransaction,
  declaringBootstrapPrivileges,
  insertMissingBy,
  insertMissingReturningIds,
  requireFrom,
} from './idempotent';
import type { PickedTable } from '../vocabularies';
import type {
  FixtureUser,
  SeedDatabase,
  SeedIngredient,
  SeedLayerIngredient,
  SeedVariant,
  SeedMembership,
  SeedTransaction,
  SeedWorkspace,
} from './types';

// The `standard` scenario: six fixture users, workspaces W and X, and a
// populated compendium. The cast is fixed, not generated, so `asUser(A)` is the
// same person in every suite. The compendium is deliberately awkward — five
// "Cat's Claw" rows, mineral varieties, `none` and `unknown` — because tidy
// data exercises nothing the identity model exists for
// (claude-docs/db/standard-scenario.md, "The compendium is awkward on purpose"). Writes go through
// the handle `seed()` was given, not `withAudit` — see minimal.ts.

/**
 * A owns W, B is a member of W, C a viewer in W, D a member of unrelated X, E a
 * site admin in no workspace, F a site curator in no workspace, G an
 * account that has not verified its address and is in no workspace.
 * `canCreateWorkspace` follows the invite gate: A–D earned it by membership,
 * and E and F, never invited, hold it by their roles, since the users CHECK
 * requires it of every role but `user`. `…0003`–`…0009`
 * continue the bootstrap's series.
 */
export const FIXTURE_USERS = {
  A: {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Fixture A',
    email: 'a@seed.sorrelandsalt.com',
    role: 'user',
    canCreateWorkspace: true,
  },
  B: {
    id: '00000000-0000-0000-0000-000000000004',
    name: 'Fixture B',
    email: 'b@seed.sorrelandsalt.com',
    role: 'user',
    canCreateWorkspace: true,
  },
  C: {
    id: '00000000-0000-0000-0000-000000000005',
    name: 'Fixture C',
    email: 'c@seed.sorrelandsalt.com',
    role: 'user',
    canCreateWorkspace: true,
  },
  D: {
    id: '00000000-0000-0000-0000-000000000006',
    name: 'Fixture D',
    email: 'd@seed.sorrelandsalt.com',
    role: 'user',
    canCreateWorkspace: true,
  },
  E: {
    id: '00000000-0000-0000-0000-000000000007',
    name: 'Fixture E',
    email: 'e@seed.sorrelandsalt.com',
    role: 'admin',
    canCreateWorkspace: true,
  },
  F: {
    id: '00000000-0000-0000-0000-000000000008',
    name: 'Fixture F',
    email: 'f@seed.sorrelandsalt.com',
    role: 'curator',
    canCreateWorkspace: true,
  },
  G: {
    id: '00000000-0000-0000-0000-000000000009',
    name: 'Fixture G',
    email: 'g@seed.sorrelandsalt.com',
    role: 'user',
    canCreateWorkspace: false,
    emailVerified: false,
  },
} satisfies Record<'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G', FixtureUser>;

/** W — the workspace A owns and B and C work in. */
export const WORKSPACE_W_ID = '00000000-0000-0000-0001-000000000001';
/** X — unrelated, and the other half of every isolation assertion. */
export const WORKSPACE_X_ID = '00000000-0000-0000-0001-000000000002';

// No slug is written down (CLAUDE.md's slug rule). Exported so the fixture
// factories can avoid these names.
export const FIXTURE_WORKSPACES: SeedWorkspace[] = [
  { id: WORKSPACE_W_ID, name: 'Whitethorn Coven' },
  { id: WORKSPACE_X_ID, name: 'Ninebark Coven' },
];

const MEMBERSHIPS: SeedMembership[] = [
  { workspaceId: WORKSPACE_W_ID, userId: FIXTURE_USERS.A.id, role: 'owner' },
  { workspaceId: WORKSPACE_W_ID, userId: FIXTURE_USERS.B.id, role: 'member' },
  { workspaceId: WORKSPACE_W_ID, userId: FIXTURE_USERS.C.id, role: 'viewer' },
  { workspaceId: WORKSPACE_X_ID, userId: FIXTURE_USERS.D.id, role: 'member' },
  // E and F are deliberately absent: "an admin has no access to any
  // workspace", and a curator none, is only assertable against one in none.
];

/**
 * A compendium entry W's cupboard holds, by the entry's formal name, with the
 * coven's own say over it. Each override is null, so the compendium's
 * value shows, unless set here. An entry with none is in the cupboard and not
 * annotated.
 */
export interface SeedCupboardEntry {
  /** The held entry, by its formal name, or by its name alone where it has none (`identityOf`). */
  entry: { name: string; canonicalName?: string | null };
  label?: string;
  description?: string;
  safetyNotes?: string;
  elements?: Array<'earth' | 'air' | 'fire' | 'water' | 'spirit'>;
  celestialBodies?: string[];
  zodiacSigns?: string[];
  colors?: string[];
}

export const STANDARD_CUPBOARD: SeedCupboardEntry[] = [
  // Rosemary the coven grows, under its own label and its own description.
  {
    entry: { name: 'Rosemary', canonicalName: 'Salvia rosmarinus' },
    label: 'Garden Rosemary',
    description: 'Cut from the bush by the back door, dried in bunches over the stove.',
  },
  // In the cupboard and not annotated: the row alone.
  { entry: { name: 'Ginger', canonicalName: 'Zingiber officinale' } },
  // Mugwort under the coven's label, with a safety note and a second celestial body.
  {
    entry: { name: 'Mugwort', canonicalName: 'Artemisia vulgaris' },
    label: 'Hedgerow Mugwort',
    safetyNotes: 'Not for anyone pregnant. Keep the smoke away from the cat.',
    celestialBodies: ['Moon', 'Neptune'],
  },
  // Lavender with a description, an element the compendium lacks and a sign of its own.
  {
    entry: { name: 'Lavender', canonicalName: 'Lavandula angustifolia' },
    description: 'Grown along the south wall and stripped into paper bags in July.',
    elements: ['air', 'water'],
    zodiacSigns: ['Pisces'],
  },
  // Only a safety note over the compendium's own text.
  {
    entry: { name: 'Comfrey', canonicalName: 'Symphytum officinale' },
    safetyNotes: 'Never taken internally here. The leaf is for poultices and the compost heap.',
  },
  // An empty element list is an answer: the coven says Sea Salt has none.
  {
    entry: { name: 'Sea Salt', canonicalName: 'Sodium chloride' },
    label: 'Kitchen Salt',
    elements: [],
    colors: ['grey', 'white'],
  },
];

/**
 * W's cupboard rows, keyed by the coven and the entry, ignoring `deleted_at` so
 * a row the coven removed is not put back. The seed writes the rows directly,
 * as it writes every other, not through the cupboard service. `demo` calls it
 * with its own list, a superset of `STANDARD_CUPBOARD`.
 */
export async function insertMissingCupboardEntries(
  tx: SeedTransaction,
  held: readonly SeedCupboardEntry[],
): Promise<void> {
  const compendium = await tx
    .select({ id: ingredients.id, identityKey: ingredients.identityKey })
    .from(ingredients)
    .where(and(isNull(ingredients.workspaceId), isNull(ingredients.deletedAt)));
  const ids = new Map(compendium.map((row) => [row.identityKey, row.id]));

  await insertMissingBy(
    tx,
    workspaceCompendiumEntries,
    held.map(({ entry, ...overrides }) => ({
      workspaceId: WORKSPACE_W_ID,
      ingredientId: requireFrom(
        ids,
        identityOf(entry),
        () => `W's cupboard holds "${entry.name}", which is not in the compendium.`,
      ),
      ...overrides,
    })),
    { columns: ['workspaceId', 'ingredientId'], toRow: (row) => row },
  );
}

/** A layer's or jar's ingredient that names an entry, in either tier: all but the custom one-off. */
export type NamedIngredient = Extract<SeedLayerIngredient, { entry: unknown }>;

/**
 * One jar of stock W holds: the entry by tier and identity, the form it holds
 * (the form's text, matched without case), and what the row says of it. A
 * `unit` carries its dimension, and a threshold left out is the dimension's
 * default, as `createStock` fills it (claude-docs/db/standard-scenario.md,
 * "W's stock").
 */
export interface SeedStock {
  id: string;
  ingredient: NamedIngredient;
  form: string;
  quantity?: string;
  unit?: Unit;
  lowStockThreshold?: string;
  source?: string;
  acquiredDate?: string;
}

/** A compendium entry by its formal name, for a jar. */
const held = (name: string, canonicalName: string): NamedIngredient => ({
  tier: 'compendium',
  entry: { name, canonicalName },
});

/**
 * W's stock in `standard`, fixed ids in a block of their own (`…0003-…`);
 * `demo` adds jars in the ids left free. Every entry named here is in
 * `STANDARD_CUPBOARD`: a jar on a compendium variant needs its entry's
 * cupboard row (decision 11).
 */
export const STANDARD_STOCK: SeedStock[] = [
  // Rosemary in two forms: two jar lines on one card, in two dimensions.
  {
    id: '00000000-0000-0000-0003-000000000003',
    ingredient: held('Rosemary', 'Salvia rosmarinus'),
    form: 'Herb',
    quantity: '60.000',
    unit: 'g',
    source: 'The bush by the back door',
  },
  {
    id: '00000000-0000-0000-0003-000000000004',
    ingredient: held('Rosemary', 'Salvia rosmarinus'),
    form: 'Oil',
    quantity: '45.000',
    unit: 'ml',
  },
  // Counted rather than weighed.
  {
    id: '00000000-0000-0000-0003-000000000007',
    ingredient: held('Ginger', 'Zingiber officinale'),
    form: 'Root',
    quantity: '6.000',
    unit: 'piece',
    acquiredDate: '2026-09-30',
  },
  // Below the default 10 g, so the Low badge shows.
  {
    id: '00000000-0000-0000-0003-000000000008',
    ingredient: held('Mugwort', 'Artemisia vulgaris'),
    form: 'Herb',
    quantity: '4.000',
    unit: 'g',
  },
  // Held and never weighed: no quantity and no unit, so no threshold either.
  {
    id: '00000000-0000-0000-0003-000000000009',
    ingredient: held('Lavender', 'Lavandula angustifolia'),
    form: 'Flower',
  },
  // Below a threshold the coven set (50 g), where the default would be 10 g.
  {
    id: '00000000-0000-0000-0003-000000000010',
    ingredient: held('Comfrey', 'Symphytum officinale'),
    form: 'Leaf',
    quantity: '30.000',
    unit: 'g',
    lowStockThreshold: '50.000',
  },
  {
    id: '00000000-0000-0000-0003-000000000011',
    ingredient: held('Sea Salt', 'Sodium chloride'),
    form: 'Salt',
    quantity: '500.000',
    unit: 'g',
    source: 'Bought by the sack',
  },
];

/** A layer's lookup key: the tier it names, and the identity within it. */
export const tierKey = (tier: 'compendium' | 'workspace', identity: string) =>
  `${tier}|${identity}`;

/**
 * The id a jar or layer's named ingredient points at. Unreachable today, but a
 * silent `undefined` would make a null `ingredient_id` — a *custom* row under
 * the CHECK — so the failure would be a blank-named row rather than an error.
 */
export function namedIngredientId(
  ingredient: NamedIngredient,
  ingredientIds: Map<string, string>,
): string {
  return requireFrom(
    ingredientIds,
    tierKey(ingredient.tier, identityOf(ingredient.entry)),
    () => `"${ingredient.entry.name}" is named by a layer or jar and is not in the database.`,
  );
}

/**
 * Every live id a jar or layer could name, keyed by its tier and `identityOf`,
 * so it finds the row of the tier it names.
 */
export async function ingredientIdByIdentity(tx: SeedTransaction): Promise<Map<string, string>> {
  const rows = await tx
    .select({
      id: ingredients.id,
      identityKey: ingredients.identityKey,
      workspaceId: ingredients.workspaceId,
    })
    .from(ingredients)
    .where(
      and(
        or(isNull(ingredients.workspaceId), eq(ingredients.workspaceId, WORKSPACE_W_ID)),
        isNull(ingredients.deletedAt),
      ),
    );
  return new Map(
    rows.map((row) => [
      tierKey(row.workspaceId === null ? 'compendium' : 'workspace', row.identityKey),
      row.id,
    ]),
  );
}

/**
 * W's jars, `standard`'s or `demo`'s, keyed by the coven and the form, ignoring `deleted_at` so a jar the
 * coven threw out is not put back and one it edited is not written over. Keyed
 * on the pair the live-unique index guards (`inventory_items_workspace_id_variant_id_unique`)
 * rather than on the fixed id, so a jar the coven added itself for the same
 * form is met and not collided with. The threshold is the dimension's default
 * unless the jar sets one, from the rule `createStock` reads.
 */
export async function insertMissingStock(
  tx: SeedTransaction,
  jars: readonly SeedStock[],
  ingredientIds: Map<string, string>,
): Promise<void> {
  const variants = await tx
    .select({
      id: ingredientVariants.id,
      ingredientId: ingredientVariants.ingredientId,
      form: ingredientVariants.form,
    })
    .from(ingredientVariants)
    .where(isNull(ingredientVariants.deletedAt));
  const variantIdByForm = new Map(
    variants.map((row) => [`${row.ingredientId}|${row.form.toLowerCase()}`, row.id]),
  );

  const wanted = jars.map((stock) => {
    const ingredientId = namedIngredientId(stock.ingredient, ingredientIds);
    return {
      stock,
      workspaceId: WORKSPACE_W_ID,
      ingredientId,
      variantId: requireFrom(
        variantIdByForm,
        `${ingredientId}|${stock.form.toLowerCase()}`,
        () =>
          `A jar names "${stock.ingredient.entry.name}" in "${stock.form}", which has no such form.`,
      ),
    };
  });

  await insertMissingBy(tx, inventoryItems, wanted, {
    columns: ['workspaceId', 'variantId'],
    where: eq(inventoryItems.workspaceId, WORKSPACE_W_ID),
    toRow: ({ stock, workspaceId, ingredientId, variantId }) => {
      const unit = stock.unit ?? null;
      const threshold = stock.lowStockThreshold ?? defaultThreshold(unit);
      return {
        id: stock.id,
        workspaceId,
        ingredientId,
        variantId,
        quantityOnHand: stock.quantity ?? null,
        unit,
        unitDimension: unit === null ? null : dimensionOf(unit),
        lowStockThreshold: threshold === null ? null : String(threshold),
        source: stock.source ?? null,
        acquiredDate: stock.acquiredDate ?? null,
      };
    },
  });
}

/**
 * Every entry declares a `nomenclature`. The awkward ones are the point: five
 * "Cat's Claw" rows told apart only by their formal names, two mineral varieties,
 * three `none` and one `unknown`, two entries worked with more than one
 * element, comfrey beside foxglove, one carrying a safety note that matters,
 * and Rosemary in two forms, its oil adding a description and a safety note
 * of its own. Every form, celestial body, zodiac sign and deity names a curated row in
 * that row's own spelling; the uncurated `rhizome` is a coven's, in
 * demo.ts.
 */
export const COMPENDIUM_INGREDIENTS: SeedIngredient[] = [
  {
    name: 'Mugwort',
    canonicalName: 'Artemisia vulgaris',
    nomenclature: 'botanical',
    variants: [{ form: 'Herb' }],
    description: 'Silver-backed leaves cut with the flowering stem, dried for smoke and tea.',
    elements: ['air', 'earth'],
    celestialBodies: ['Moon'],
    deities: ['Artemis', 'Diana'],
    categories: ['Dream Work', 'Divination', 'Psychic Work'],
    folkNames: ['Cronewort', "Sailor's Tobacco", 'Felon Herb'],
  },
  {
    name: 'Wormwood',
    canonicalName: 'Artemisia absinthium',
    nomenclature: 'botanical',
    variants: [{ form: 'Herb' }],
    description: 'Bitter grey-green herb, the other Artemisia — and not interchangeable.',
    elements: ['fire'],
    celestialBodies: ['Mars'],
    safetyNotes: 'Thujone. Not for internal use in any quantity, and never in pregnancy.',
    categories: ['Banishing', 'Spirit Work'],
    folkNames: ['Green Ginger', 'Absinthium'],
  },
  {
    name: 'Bay Laurel',
    canonicalName: 'Laurus nobilis',
    nomenclature: 'botanical',
    variants: [{ form: 'Leaf' }],
    description: 'Whole leaves, written on and burned for a wish.',
    elements: ['fire'],
    celestialBodies: ['Sun'],
    zodiacSigns: ['Leo'],
    deities: ['Apollo'],
    categories: ['Success', 'Protection', 'Clarity'],
    folkNames: ['Sweet Bay', 'Bay'],
  },
  {
    name: 'Rosemary',
    canonicalName: 'Salvia rosmarinus',
    nomenclature: 'botanical',
    // The one entry with two forms: the oil adds its own description
    // and a safety note the herb does not need.
    variants: [
      { form: 'Herb' },
      {
        form: 'Oil',
        description: 'Sprigs steeped in olive oil for a month, then strained, for anointing.',
        safetyNotes:
          'Dry the sprigs first: a fresh herb in oil can grow botulism. Keep it cool, and never eat it.',
      },
    ],
    description: 'Needled sprigs. Renamed out of Rosmarinus in 2017, which is why the label moves.',
    elements: ['fire'],
    celestialBodies: ['Sun'],
    categories: ['Protection', 'Memory', 'Cleansing'],
    folkNames: ['Dew of the Sea', 'Compass Weed'],
  },
  {
    name: 'Lavender',
    canonicalName: 'Lavandula angustifolia',
    nomenclature: 'botanical',
    variants: [{ form: 'Flower' }],
    description: 'Buds stripped from the stem.',
    elements: ['air'],
    celestialBodies: ['Mercury'],
    zodiacSigns: ['Gemini', 'Virgo'],
    categories: ['Peace', 'Sleep', 'Harmony'],
    folkNames: ['English Lavender', 'Elf Leaf'],
  },
  {
    // A cultivar: same species as the row above and a different entry, since
    // `canonicalName` is the most specific accepted name.
    name: 'Hidcote Lavender',
    canonicalName: "Lavandula angustifolia 'Hidcote'",
    nomenclature: 'botanical',
    variants: [{ form: 'Flower' }],
    description: 'A dark-flowered cultivar, kept separate from the species it belongs to.',
    elements: ['air'],
    celestialBodies: ['Mercury'],
    categories: ['Peace', 'Sleep'],
  },
  {
    name: 'Comfrey',
    canonicalName: 'Symphytum officinale',
    nomenclature: 'botanical',
    variants: [{ form: 'Leaf' }],
    description: 'Broad hairy leaves, dried flat.',
    elements: ['water'],
    celestialBodies: ['Saturn'],
    safetyNotes:
      'Confused with foxglove leaf in the field, which is fatal. Check the flower before cutting.',
    categories: ['Healing', 'Safe Travel'],
    folkNames: ['Knitbone', 'Boneset'],
  },
  {
    name: 'Foxglove',
    canonicalName: 'Digitalis purpurea',
    nomenclature: 'botanical',
    variants: [{ form: 'Leaf' }],
    description: 'The other broad hairy leaf, and the reason the compendium demands a formal name.',
    elements: ['water'],
    celestialBodies: ['Venus'],
    safetyNotes: 'Cardiac glycosides. Never ingested, never infused, and handled with gloves.',
    categories: ['Spirit Work'],
    folkNames: ["Witches' Gloves", "Dead Man's Bells"],
  },
  {
    name: "Cat's Claw",
    canonicalName: 'Uncaria tomentosa',
    nomenclature: 'botanical',
    variants: [{ form: 'Bark' }],
    description: 'Inner bark of the Amazonian vine.',
    elements: ['earth'],
    categories: ['Healing', 'Strength'],
    folkNames: ['Uña de Gato', 'Vilcacora'],
  },
  {
    name: "Cat's Claw",
    canonicalName: 'Uncaria guianensis',
    nomenclature: 'botanical',
    variants: [{ form: 'Bark' }],
    description: 'The other Uncaria sold under the same name, and not the same plant.',
    elements: ['earth'],
    categories: ['Healing'],
    folkNames: ['Uña de Gato'],
  },
  {
    name: "Cat's Claw",
    canonicalName: 'Senegalia greggii',
    nomenclature: 'botanical',
    variants: [{ form: 'Thorn' }],
    description: 'Hooked thorns off the desert acacia. Renamed out of Acacia, like two of its kin.',
    elements: ['earth'],
    categories: ['Binding', 'Protection'],
    folkNames: ['Catclaw Acacia', 'Wait-a-Minute Bush'],
  },
  {
    name: "Cat's Claw",
    canonicalName: 'Dolichandra unguis-cati',
    nomenclature: 'botanical',
    variants: [{ form: 'Leaf' }],
    description: 'A climbing vine whose tendrils hook like claws.',
    elements: ['earth'],
    categories: ['Binding'],
  },
  {
    // Not a plant at all — why the display label cannot carry identity.
    name: "Cat's Claw",
    canonicalName: 'Felis catus',
    nomenclature: 'zoological',
    variants: [{ form: 'Claw' }],
    description: 'A claw, shed or clipped, kept from a household cat.',
    elements: ['spirit'],
    categories: ['Familiar Work', 'Protection'],
  },
  {
    name: 'Beeswax',
    canonicalName: 'Apis mellifera',
    nomenclature: 'zoological',
    variants: [{ form: 'Wax' }],
    description: 'Comb rendered and strained, still smelling of the hive.',
    elements: ['earth'],
    celestialBodies: ['Venus'],
    categories: ['Abundance', 'Home Blessing'],
  },
  {
    name: 'Reishi',
    canonicalName: 'Ganoderma lingzhi',
    nomenclature: 'fungal',
    variants: [{ form: 'Mushroom' }],
    description: 'Lacquered shelf fungus, sliced and dried.',
    elements: ['earth'],
    categories: ['Longevity', 'Wisdom'],
    folkNames: ['Lingzhi', 'Mushroom of Immortality'],
  },
  {
    name: 'Fly Agaric',
    canonicalName: 'Amanita muscaria',
    nomenclature: 'fungal',
    variants: [{ form: 'Mushroom' }],
    description: 'Red cap, white flecks. Kept as a curio rather than a preparation.',
    elements: ['air'],
    safetyNotes: 'Ibotenic acid and muscimol. Not a food, and not a tea.',
    categories: ['Divination'],
    folkNames: ['Amanita', 'Toadstool'],
  },
  {
    name: 'Amethyst',
    canonicalName: 'Quartz var. amethyst',
    nomenclature: 'mineral',
    variants: [{ form: 'Crystal' }],
    description: 'Purple quartz, a variety rather than a species of its own.',
    elements: ['water'],
    categories: ['Intuition', 'Sleep', 'Clarity'],
  },
  {
    name: 'Selenite',
    canonicalName: 'Gypsum var. selenite',
    nomenclature: 'mineral',
    variants: [{ form: 'Crystal' }],
    description: 'Clear bladed gypsum. Dissolves in water, so it is never charged in it.',
    elements: ['spirit'],
    categories: ['Cleansing', 'Purification'],
    folkNames: ['Satin Spar'],
  },
  {
    // A rock rather than a species; the mineral system covers it too.
    name: 'Lapis Lazuli',
    canonicalName: 'Lapis lazuli',
    nomenclature: 'mineral',
    variants: [{ form: 'Stone' }],
    description: 'Lazurite-bearing rock flecked with pyrite.',
    elements: ['air'],
    categories: ['Truth', 'Wisdom'],
  },
  {
    name: 'Sea Salt',
    canonicalName: 'Sodium chloride',
    nomenclature: 'chemical',
    variants: [{ form: 'Salt' }],
    description: 'Coarse grey salt, evaporated rather than mined.',
    elements: ['water', 'earth'],
    categories: ['Cleansing', 'Warding'],
  },
  {
    name: 'Saltpetre',
    canonicalName: 'Potassium nitrate',
    nomenclature: 'chemical',
    variants: [{ form: 'Powder' }],
    description: 'White crystalline powder, ground fine.',
    elements: ['fire'],
    safetyNotes: 'An oxidiser. Kept away from anything that burns.',
    categories: ['Uncrossing', 'Reversal'],
  },
  {
    // `none` is a positive claim: no naming system names this thing.
    name: 'Graveyard Dirt',
    nomenclature: 'none',
    variants: [{ form: 'Earth' }],
    description: 'Dirt taken from a grave, paid for at the gate.',
    elements: ['earth'],
    categories: ['Ancestor Work', 'Spirit Work'],
  },
  {
    name: 'Moon Water',
    nomenclature: 'none',
    variants: [{ form: 'Water' }],
    description: 'Water left out under a full moon.',
    elements: ['water'],
    categories: ['Psychic Work', 'Divination'],
  },
  {
    // A preparation rather than a substance, which is why no system names it.
    name: 'Black Salt',
    nomenclature: 'none',
    variants: [{ form: 'Salt' }],
    description: 'Salt blackened with ash, scraped soot or ground charcoal.',
    elements: ['earth'],
    categories: ['Banishing', 'Warding'],
  },
  {
    // `unknown`, not `none`: there is a plant behind the name and nobody has
    // looked it up — the curation to-do row.
    name: "Devil's Shoestring",
    nomenclature: 'unknown',
    variants: [{ form: 'Root' }],
    description: 'Wiry root cut into lengths, tied and carried.',
    elements: ['earth'],
    categories: ['Protection', 'Gambling'],
    folkNames: ['Devil Shoestrings'],
  },
  {
    // Sold as ginger root, and filed under the curated `Root`: the uncurated
    // `rhizome` is a coven's to write (demo.ts), never the compendium's.
    name: 'Ginger',
    canonicalName: 'Zingiber officinale',
    nomenclature: 'botanical',
    variants: [{ form: 'Root' }],
    description: 'Knobbed root, sliced and dried.',
    elements: ['fire'],
    celestialBodies: ['Mars'],
    categories: ['Success', 'Lust', 'Strength'],
  },
];

export async function seedStandard(db: SeedDatabase): Promise<void> {
  await beginSeedTransaction(db, seedStandardContent);
}

/**
 * The same scenario inside a transaction the caller already opened: `demo`
 * writes its grimoire alongside these rows, so a half-applied scenario cannot
 * be a grimoire referencing rows that are not there. Assumes the GUC is
 * published and the bootstrap user exists.
 *
 * `restoreDeletedDeityPicks` is `standard`'s reset of its fixtures: on, a
 * compendium deity pick an admin deleted comes back on the next run. `demo`
 * turns it off, since a person explores it and a deletion there is theirs —
 * claude-docs/db/standard-scenario.md, "A reseed of standard puts a deity
 * pick back; demo does not".
 */
export async function seedStandardContent(
  tx: SeedTransaction,
  { restoreDeletedDeityPicks = true }: { restoreDeletedDeityPicks?: boolean } = {},
): Promise<void> {
  // Reference data first: an ingredient is filed under a category by foreign
  // key. Inside this transaction so a scenario is never half-applied.
  await seedFormVocabulary(tx);
  await seedCategoryVocabulary(tx);
  await seedAstrologyVocabularies(tx);
  await seedDeityVocabulary(tx);
  await seedVocabularySources(tx);

  await insertMissingUsers(tx);
  await insertMissingWorkspaces(tx);
  await insertMissingMemberships(tx);

  const ingredientIds = await insertMissingIngredients(tx);
  await reslugIngredients(tx, [...ingredientIds.values()]);
  await insertMissingRetiredSlugs(tx, ingredientIds);
  await insertMissingVariants(
    tx,
    COMPENDIUM_INGREDIENTS.map((entry) => ({
      ingredientId: ingredientIdFor(entry, ingredientIds),
      variants: entry.variants,
    })),
    await pickedIdByName(tx, ingredientForms),
  );
  await insertMissingFolkNames(tx, ingredientIds);
  await insertMissingDeities(tx, ingredientIds, restoreDeletedDeityPicks);
  await insertMissingCategoryAssignments(tx, ingredientIds, await categoryIdByName(tx));
  await insertMissingCupboardEntries(tx, STANDARD_CUPBOARD);
  await insertMissingStock(tx, STANDARD_STOCK, await ingredientIdByIdentity(tx));
}

/**
 * The live rows of a two-tier vocabulary by folded name, for the compendium's
 * picks: every compendium form and deity is a pick of a curated row,
 * as an admin's would be. A name two live rows share has no one row to pick,
 * so it is thrown rather than guessed; the literal then names its row.
 */
async function pickedIdByName(
  tx: SeedTransaction,
  table: PickedTable,
): Promise<Map<string, string>> {
  const rows = await tx
    .select({ id: table.id, name: table.name })
    .from(table)
    .where(isNull(table.deletedAt));
  const ids = new Map<string, string>();
  const shared = new Set<string>();
  for (const row of rows) {
    const fold = row.name.toLowerCase();
    if (ids.has(fold)) shared.add(fold);
    ids.set(fold, row.id);
  }
  for (const fold of shared) ids.delete(fold);
  return ids;
}

/** A name as the unique indexes on `lower(name)` compare it. */
const lowerCase = (name: string) => name.toLowerCase();

function pickOf(ids: Map<string, string>, name: string, what: string): string {
  return requireFrom(
    ids,
    name.toLowerCase(),
    () => `The seed picks the ${what} "${name}", which no one live row is called.`,
  );
}

// Idempotent the way seedCategories is: inserts what is missing by identity,
// ignoring `deleted_at` so a soft-deleted entry is not quietly restored, and
// updates nothing already present.

// The cast holds its privileges from its first insert, so the trigger on
// `users` records them, by the seed's route, `bootstrap`. A–D's and
// F's grants are stamped as the seed's own user, which inserts them. E
// is inserted alone and as itself, so its two grants are stamped as E, as a
// primary admin's promotion is stamped as that admin; its `users` row is
// still the seed's, as every seeded row is.
async function insertMissingUsers(tx: SeedTransaction): Promise<void> {
  const { E, ...cast } = FIXTURE_USERS;

  await declaringBootstrapPrivileges(tx, BOOTSTRAP_SESSION.userId, () =>
    insertMissingFixtureUsers(tx, Object.values(cast)),
  );
  await declaringBootstrapPrivileges(tx, E.id, () => insertMissingFixtureUsers(tx, [E]));
}

async function insertMissingFixtureUsers(
  tx: SeedTransaction,
  wanted: readonly FixtureUser[],
): Promise<void> {
  await insertMissingBy(tx, users, wanted, {
    columns: ['id'],
    toRow: (user) => ({ emailVerified: true, ...user }),
  });
}

async function insertMissingWorkspaces(tx: SeedTransaction): Promise<void> {
  await insertMissingBy(tx, workspaces, FIXTURE_WORKSPACES, {
    columns: ['id'],
    toRow: (workspace) => ({ ...workspace, slug: slugify(workspace.name) }),
  });
}

async function insertMissingMemberships(tx: SeedTransaction): Promise<void> {
  await insertMissingBy(tx, workspaceMembers, MEMBERSHIPS, {
    columns: ['workspaceId', 'userId'],
    toRow: (membership) => membership,
  });
}

/**
 * An entry's identity as the seed keys it: its formal name, or its label
 * without one, lower-cased — what `identity_key` holds, which the
 * identity indexes keep once per tier. Keyed on that rather than the label, so
 * an entry an admin or a member relabelled is still the one the seed wrote,
 * and is not inserted again beside itself, which the index would refuse. A
 * row's key is the generated column itself; a literal's is folded here, where
 * JavaScript's lower-casing agrees with Postgres's on the seed's ASCII names.
 * It says nothing about the tier, so a caller builds its map from one tier's
 * rows.
 */
export function identityOf(entry: { name: string; canonicalName?: string | null }): string {
  return (entry.canonicalName ?? entry.name).toLowerCase();
}

/**
 * Each row's id by its `identity_key`, a live row over a deleted one holding
 * the same key, so what the seed writes beside an entry lands on the live one.
 */
function idsByIdentity(
  rows: readonly { id: string; identityKey: string; deletedAt: Date | null }[],
): Map<string, string> {
  const ordered = [...rows].sort(
    (a, b) => Number(a.deletedAt === null) - Number(b.deletedAt === null),
  );
  return new Map(ordered.map((row) => [row.identityKey, row.id]));
}

/**
 * Inserts what is missing and returns every seeded entry's id, by identity,
 * over the compendium tier's rows, deleted or not.
 */
async function insertMissingIngredients(tx: SeedTransaction): Promise<Map<string, string>> {
  const existing = await tx
    .select({
      id: ingredients.id,
      identityKey: ingredients.identityKey,
      deletedAt: ingredients.deletedAt,
    })
    .from(ingredients)
    .where(isNull(ingredients.workspaceId));

  return insertMissingReturningIds(
    tx,
    ingredients,
    COMPENDIUM_INGREDIENTS,
    idsByIdentity(existing),
    {
      keyOf: identityOf,
      keyOfRow: (row) => row.identityKey,
      toRow: ({
        variants: _variants,
        folkNames: _folkNames,
        categories: _categories,
        deities: _deities,
        ...entry
      }) => ({
        ...entry,
        slug: ingredientSlug(entry.name, entry.canonicalName),
      }),
    },
  );
}

/**
 * The backfill a slug without its form needs, run on every seed over
 * the seed's own entries, `ingredientIds`: each live entry's slug re-derived
 * from its label and formal name and written where it differs, so a reseed
 * with nothing to change writes nothing. A compendium entry's old slug is
 * retired, to redirect for 180 days as an admin's save retires one; a
 * coven's retires nothing, since no route reads it. A rewrite in SQL would be
 * a second slug rule (0025's precedent), so the seed is the backfill for its
 * own rows, and every other row moves at its next save. A slug another live
 * row of the tier already holds is left as it is, so a reseed never fails on
 * a row an admin wrote.
 */
export async function reslugIngredients(
  tx: SeedTransaction,
  ingredientIds: readonly string[],
): Promise<void> {
  if (ingredientIds.length === 0) return;
  const rows = await tx
    .select({
      id: ingredients.id,
      workspaceId: ingredients.workspaceId,
      name: ingredients.name,
      canonicalName: ingredients.canonicalName,
      slug: ingredients.slug,
    })
    .from(ingredients)
    .where(and(inArray(ingredients.id, ingredientIds), isNull(ingredients.deletedAt)));

  for (const { id, workspaceId, name, canonicalName, slug } of rows) {
    const derived = ingredientSlug(name, canonicalName);
    if (derived === slug) continue;
    const [holder] = await tx
      .select({ id: ingredients.id })
      .from(ingredients)
      .where(
        and(
          workspaceId === null
            ? isNull(ingredients.workspaceId)
            : eq(ingredients.workspaceId, workspaceId),
          eq(ingredients.slug, derived),
          ne(ingredients.id, id),
          isNull(ingredients.deletedAt),
        ),
      );
    if (holder) continue;

    await tx
      .update(ingredients)
      .set(applyAudit('update', { slug: derived }, BOOTSTRAP_SESSION) as never)
      .where(eq(ingredients.id, id));
    if (workspaceId === null) {
      await tx
        .insert(retiredIngredientSlugs)
        .values(
          applyAudit(
            'insert',
            { ingredientId: id, workspaceId: null, slug },
            BOOTSTRAP_SESSION,
          ) as never,
        );
    }
  }
}

/**
 * The two compendium retirements `standard` holds on purpose, one of
 * each redirect the public entry page answers. `entry` names the entry that
 * keeps the row, as its literal does; `name` and `canonicalName` are what the
 * retired slug derives from, so no slug is written down beside the rule.
 *
 * - Rosemary: the slug it had under its older formal name. Nobody holds it, so
 *   it redirects (308) to Rosemary's current address.
 * - Hidcote Lavender: the slug it was first entered under, the species' own.
 *   The species entry holds it now, so that address shows the species with a
 *   notice that Hidcote Lavender moved away.
 */
const RETIRED_COMPENDIUM_SLUGS: {
  entry: { name: string; canonicalName: string };
  name: string;
  canonicalName: string;
}[] = [
  {
    entry: { name: 'Rosemary', canonicalName: 'Salvia rosmarinus' },
    name: 'Rosemary',
    canonicalName: 'Rosmarinus officinalis',
  },
  {
    entry: { name: 'Hidcote Lavender', canonicalName: "Lavandula angustifolia 'Hidcote'" },
    name: 'Lavender',
    canonicalName: 'Lavandula angustifolia',
  },
];

/**
 * Writes `RETIRED_COMPENDIUM_SLUGS`, each keyed on its entry and slug, since
 * the table's slug index is not unique and a reseed would otherwise stack
 * copies. `retired_at` defaults to the run's instant, so the 180-day window
 * runs from the last run that wrote the row. A compendium write hard-deletes
 * lapsed rows, and the next reseed then writes them again; that is fine for
 * fixtures (claude-docs/db/standard-scenario.md).
 */
export async function insertMissingRetiredSlugs(
  tx: SeedTransaction,
  ingredientIds: Map<string, string>,
): Promise<void> {
  const wanted = RETIRED_COMPENDIUM_SLUGS.map(({ entry, name, canonicalName }) => ({
    ingredientId: requireFrom(
      ingredientIds,
      identityOf(entry),
      () => `Compendium entry ${entry.name} was neither found nor inserted.`,
    ),
    slug: ingredientSlug(name, canonicalName),
  }));

  await insertMissingBy(tx, retiredIngredientSlugs, wanted, {
    columns: ['ingredientId', 'slug'],
    where: inArray(
      retiredIngredientSlugs.ingredientId,
      wanted.map((item) => item.ingredientId),
    ),
    toRow: ({ ingredientId, slug }) => ({ ingredientId, workspaceId: null, slug }),
  });
}

/**
 * Each entry's forms as its variants, `entries` naming the entry's
 * id beside the forms its literal lists, so every seeded layer can name one.
 * `formIds` picks each form by name from the curated rows, as an admin's
 * compendium form is a pick; without it a form is typed, as a
 * coven's may be. Keyed as the variant's unique index keys it, the entry and
 * the folded form; a variant an admin removed counts as present, so it is not
 * restored, and one already there is not rewritten.
 */
export async function insertMissingVariants(
  tx: SeedTransaction,
  entries: readonly { ingredientId: string; variants: readonly SeedVariant[] }[],
  formIds?: Map<string, string>,
): Promise<void> {
  if (entries.length === 0) return;
  const wanted = entries.flatMap(({ ingredientId, variants }) =>
    variants.map((variant) => ({
      ...variant,
      ingredientId,
      formId: formIds ? pickOf(formIds, variant.form, 'form') : null,
    })),
  );

  await insertMissingBy(tx, ingredientVariants, wanted, {
    columns: ['ingredientId', 'form'],
    fold: { form: (form) => form.trim().toLowerCase() },
    where: inArray(
      ingredientVariants.ingredientId,
      entries.map((entry) => entry.ingredientId),
    ),
    toRow: (variant) => ({ ...variant, form: variant.form.trim() }),
  });
}

function ingredientIdFor(entry: SeedIngredient, ingredientIds: Map<string, string>): string {
  return requireFrom(
    ingredientIds,
    identityOf(entry),
    () => `Compendium entry ${entry.name} was neither found nor inserted.`,
  );
}

async function insertMissingFolkNames(
  tx: SeedTransaction,
  ingredientIds: Map<string, string>,
): Promise<void> {
  const wanted = COMPENDIUM_INGREDIENTS.flatMap((entry) =>
    (entry.folkNames ?? []).map((name) => ({
      ingredientId: ingredientIdFor(entry, ingredientIds),
      name,
    })),
  );

  // Case-folded because the unique index is on `lower(name)`.
  await insertMissingBy(tx, ingredientFolkNames, wanted, {
    columns: ['ingredientId', 'name'],
    fold: { name: lowerCase },
    toRow: (folkName) => folkName,
  });
}

/**
 * Each entry's deities, picked in the literal's order, keyed on the case-folded name
 * the row holds. A missing pick goes after the entry's live picks, so a second run
 * moves nothing (claude-docs/db/standard-scenario.md). (claude-docs/db/compendium-seed/README.md, "Seed comments in full")
 */
async function insertMissingDeities(
  tx: SeedTransaction,
  ingredientIds: Map<string, string>,
  restoreDeleted: boolean,
): Promise<void> {
  const deityIds = await pickedIdByName(tx, deities);
  const wanted = COMPENDIUM_INGREDIENTS.flatMap((entry) =>
    (entry.deities ?? []).map((name) => ({
      ingredientId: ingredientIdFor(entry, ingredientIds),
      deityId: pickOf(deityIds, name, 'deity'),
      name,
    })),
  );
  const nextPosition = await nextDeityPositions(tx);
  const placed = (ingredientId: string) => {
    const position = nextPosition.get(ingredientId) ?? 0;
    nextPosition.set(ingredientId, position + 1);
    return position;
  };

  await insertMissingBy(tx, ingredientDeities, wanted, {
    columns: ['ingredientId', 'name'],
    fold: { name: lowerCase },
    where: restoreDeleted ? isNull(ingredientDeities.deletedAt) : undefined,
    // Called once per missing pick, in the literal's order.
    toRow: (deity) => ({ ...deity, position: placed(deity.ingredientId) }),
  });
}

/** One past each ingredient's highest live deity position: the end of its list. */
async function nextDeityPositions(tx: SeedTransaction): Promise<Map<string, number>> {
  const rows = await tx
    .select({
      ingredientId: ingredientDeities.ingredientId,
      position: max(ingredientDeities.position),
    })
    .from(ingredientDeities)
    .where(isNull(ingredientDeities.deletedAt))
    .groupBy(ingredientDeities.ingredientId);
  return new Map(rows.map((row) => [row.ingredientId, (row.position ?? -1) + 1]));
}

async function insertMissingCategoryAssignments(
  tx: SeedTransaction,
  ingredientIds: Map<string, string>,
  categoryIds: Map<string, string>,
): Promise<void> {
  const wanted = COMPENDIUM_INGREDIENTS.flatMap((entry) =>
    entry.categories.map((name) => ({
      ingredientId: ingredientIdFor(entry, ingredientIds),
      categoryId: requireFrom(
        categoryIds,
        name,
        () => `"${entry.name}" names category "${name}", which is not in the database.`,
      ),
    })),
  );

  // Hard-deleted: the four-column stamp set, so `applyAudit` stamps
  // fewer columns.
  await insertMissingBy(tx, ingredientCategories, wanted, {
    columns: ['ingredientId', 'categoryId'],
    toRow: (assignment) => assignment,
  });
}
