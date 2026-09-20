import { inArray, isNull } from 'drizzle-orm';
// `./bootstrap-admin` first, and load-bearing — see minimal.ts.
import { BOOTSTRAP_SESSION } from './bootstrap-admin';
import { users } from '../schema/users';
import { workspaceMembers, workspaces } from '../schema/workspaces';
import { ingredients } from '../schema/ingredients';
import { ingredientFolkNames } from '../schema/ingredient-folk-names';
import { ingredientCategories } from '../schema/ingredient-categories';
import { applyAudit } from '../audit';
import { slugify } from '../../lib/slugify';
import { categoryIdByName, seedCategoryVocabulary } from './categories';
import { seedFormVocabulary } from './forms';
import { beginSeedTransaction, insertMissing, requireFrom } from './idempotent';
import type { SeedDatabase, SeedTransaction } from './index';

// The `standard` scenario: five fixture users, workspaces W and X, and a
// populated compendium. The cast is fixed, not generated, so `asUser(A)` is the
// same person in every suite. The compendium is deliberately awkward — five
// "Cat's Claw" rows, mineral varieties, `none` and `unknown`, an uncurated
// form — because tidy data exercises nothing the identity model exists for
// (claude-docs/db.md, "The compendium is awkward on purpose"). Writes go through
// the handle `seed()` was given, not `withAudit` — see minimal.ts.

/**
 * `id` is required rather than picked: the table defaults it, and a test
 * asserting against A has to name one id. `…0003`–`…0007` continue the
 * bootstrap's series.
 */
type SeedUser = Pick<
  typeof users.$inferInsert,
  'name' | 'email' | 'role' | 'canCreateWorkspace'
> & { id: string };

/**
 * A owns W, B is a member of W, C a viewer in W, D a member of unrelated X, E a
 * site admin in no workspace. `canCreateWorkspace` follows the invite gate: A–D
 * earned it by membership, E was never invited and creates workspaces as an
 * admin instead.
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
    canCreateWorkspace: false,
  },
} satisfies Record<'A' | 'B' | 'C' | 'D' | 'E', SeedUser>;

/** W — the workspace A owns and B and C work in. */
export const WORKSPACE_W_ID = '00000000-0000-0000-0001-000000000001';
/** X — unrelated, and the other half of every isolation assertion. */
export const WORKSPACE_X_ID = '00000000-0000-0000-0001-000000000002';

type SeedWorkspace = Pick<typeof workspaces.$inferInsert, 'name'> & { id: string };

// No slug is written down (CLAUDE.md's slug rule). Exported so the fixture
// factories can avoid these names.
export const FIXTURE_WORKSPACES: SeedWorkspace[] = [
  { id: WORKSPACE_W_ID, name: 'Whitethorn Coven' },
  { id: WORKSPACE_X_ID, name: 'Ninebark Coven' },
];

type SeedMembership = Pick<typeof workspaceMembers.$inferInsert, 'workspaceId' | 'userId' | 'role'>;

const MEMBERSHIPS: SeedMembership[] = [
  { workspaceId: WORKSPACE_W_ID, userId: FIXTURE_USERS.A.id, role: 'owner' },
  { workspaceId: WORKSPACE_W_ID, userId: FIXTURE_USERS.B.id, role: 'member' },
  { workspaceId: WORKSPACE_W_ID, userId: FIXTURE_USERS.C.id, role: 'viewer' },
  { workspaceId: WORKSPACE_X_ID, userId: FIXTURE_USERS.D.id, role: 'member' },
  // E is deliberately absent: "an admin has no access to any workspace" is
  // only assertable against one in no workspace.
];

/** One compendium entry plus its folk names and categories, named rather than keyed. */
type SeedIngredient = Pick<
  typeof ingredients.$inferInsert,
  | 'name'
  | 'canonicalName'
  | 'nomenclature'
  | 'form'
  | 'description'
  | 'element'
  | 'planet'
  | 'safetyNotes'
> & {
  folkNames?: string[];
  categories: string[];
};

/**
 * Every entry declares a `nomenclature`. The awkward ones are the point: five
 * "Cat's Claw" rows told apart only by `canonicalKey`, two mineral varieties,
 * three `none` and one `unknown`, one uncurated form (`rhizome`), and comfrey
 * beside foxglove, one carrying a safety note that matters.
 */
export const COMPENDIUM_INGREDIENTS: SeedIngredient[] = [
  {
    name: 'Mugwort',
    canonicalName: 'Artemisia vulgaris',
    nomenclature: 'botanical',
    form: 'herb',
    description: 'Silver-backed leaves cut with the flowering stem, dried for smoke and tea.',
    element: 'air',
    planet: 'Moon',
    categories: ['Dream Work', 'Divination', 'Psychic Work'],
    folkNames: ['Cronewort', "Sailor's Tobacco", 'Felon Herb'],
  },
  {
    name: 'Wormwood',
    canonicalName: 'Artemisia absinthium',
    nomenclature: 'botanical',
    form: 'herb',
    description: 'Bitter grey-green herb, the other Artemisia — and not interchangeable.',
    element: 'fire',
    planet: 'Mars',
    safetyNotes: 'Thujone. Not for internal use in any quantity, and never in pregnancy.',
    categories: ['Banishing', 'Spirit Work'],
    folkNames: ['Green Ginger', 'Absinthium'],
  },
  {
    name: 'Bay Laurel',
    canonicalName: 'Laurus nobilis',
    nomenclature: 'botanical',
    form: 'leaf',
    description: 'Whole leaves, written on and burned for a wish.',
    element: 'fire',
    planet: 'Sun',
    categories: ['Success', 'Protection', 'Clarity'],
    folkNames: ['Sweet Bay', 'Bay'],
  },
  {
    name: 'Rosemary',
    canonicalName: 'Salvia rosmarinus',
    nomenclature: 'botanical',
    form: 'herb',
    description: 'Needled sprigs. Renamed out of Rosmarinus in 2017, which is why the label moves.',
    element: 'fire',
    planet: 'Sun',
    categories: ['Protection', 'Memory', 'Cleansing'],
    folkNames: ['Dew of the Sea', 'Compass Weed'],
  },
  {
    name: 'Lavender',
    canonicalName: 'Lavandula angustifolia',
    nomenclature: 'botanical',
    form: 'flower',
    description: 'Buds stripped from the stem.',
    element: 'air',
    planet: 'Mercury',
    categories: ['Peace', 'Sleep', 'Harmony'],
    folkNames: ['English Lavender', 'Elf Leaf'],
  },
  {
    // A cultivar: same species as the row above and a different entry, since
    // `canonicalName` is the most specific accepted name.
    name: 'Hidcote Lavender',
    canonicalName: "Lavandula angustifolia 'Hidcote'",
    nomenclature: 'botanical',
    form: 'flower',
    description: 'A dark-flowered cultivar, kept separate from the species it belongs to.',
    element: 'air',
    planet: 'Mercury',
    categories: ['Peace', 'Sleep'],
  },
  {
    name: 'Comfrey',
    canonicalName: 'Symphytum officinale',
    nomenclature: 'botanical',
    form: 'leaf',
    description: 'Broad hairy leaves, dried flat.',
    element: 'water',
    planet: 'Saturn',
    safetyNotes:
      'Confused with foxglove leaf in the field, which is fatal. Check the flower before cutting.',
    categories: ['Healing', 'Safe Travel'],
    folkNames: ['Knitbone', 'Boneset'],
  },
  {
    name: 'Foxglove',
    canonicalName: 'Digitalis purpurea',
    nomenclature: 'botanical',
    form: 'leaf',
    description: 'The other broad hairy leaf, and the reason the compendium demands a formal name.',
    element: 'water',
    planet: 'Venus',
    safetyNotes: 'Cardiac glycosides. Never ingested, never infused, and handled with gloves.',
    categories: ['Spirit Work'],
    folkNames: ["Witches' Gloves", "Dead Man's Bells"],
  },
  {
    name: "Cat's Claw",
    canonicalName: 'Uncaria tomentosa',
    nomenclature: 'botanical',
    form: 'bark',
    description: 'Inner bark of the Amazonian vine.',
    element: 'earth',
    categories: ['Healing', 'Strength'],
    folkNames: ['Uña de Gato', 'Vilcacora'],
  },
  {
    name: "Cat's Claw",
    canonicalName: 'Uncaria guianensis',
    nomenclature: 'botanical',
    form: 'bark',
    description: 'The other Uncaria sold under the same name, and not the same plant.',
    element: 'earth',
    categories: ['Healing'],
    folkNames: ['Uña de Gato'],
  },
  {
    name: "Cat's Claw",
    canonicalName: 'Senegalia greggii',
    nomenclature: 'botanical',
    form: 'thorn',
    description: 'Hooked thorns off the desert acacia. Renamed out of Acacia, like two of its kin.',
    element: 'earth',
    categories: ['Binding', 'Protection'],
    folkNames: ['Catclaw Acacia', 'Wait-a-Minute Bush'],
  },
  {
    name: "Cat's Claw",
    canonicalName: 'Dolichandra unguis-cati',
    nomenclature: 'botanical',
    form: 'leaf',
    description: 'A climbing vine whose tendrils hook like claws.',
    element: 'earth',
    categories: ['Binding'],
  },
  {
    // Not a plant at all — why the display label cannot carry identity.
    name: "Cat's Claw",
    canonicalName: 'Felis catus',
    nomenclature: 'zoological',
    form: 'claw',
    description: 'A claw, shed or clipped, kept from a household cat.',
    element: 'spirit',
    categories: ['Familiar Work', 'Protection'],
  },
  {
    name: 'Beeswax',
    canonicalName: 'Apis mellifera',
    nomenclature: 'zoological',
    form: 'wax',
    description: 'Comb rendered and strained, still smelling of the hive.',
    element: 'earth',
    planet: 'Venus',
    categories: ['Abundance', 'Home Blessing'],
  },
  {
    name: 'Reishi',
    canonicalName: 'Ganoderma lingzhi',
    nomenclature: 'fungal',
    form: 'mushroom',
    description: 'Lacquered shelf fungus, sliced and dried.',
    element: 'earth',
    categories: ['Longevity', 'Wisdom'],
    folkNames: ['Lingzhi', 'Mushroom of Immortality'],
  },
  {
    name: 'Fly Agaric',
    canonicalName: 'Amanita muscaria',
    nomenclature: 'fungal',
    form: 'mushroom',
    description: 'Red cap, white flecks. Kept as a curio rather than a preparation.',
    element: 'air',
    safetyNotes: 'Ibotenic acid and muscimol. Not a food, and not a tea.',
    categories: ['Divination'],
    folkNames: ['Amanita', 'Toadstool'],
  },
  {
    name: 'Amethyst',
    canonicalName: 'Quartz var. amethyst',
    nomenclature: 'mineral',
    form: 'crystal',
    description: 'Purple quartz, a variety rather than a species of its own.',
    element: 'water',
    categories: ['Intuition', 'Sleep', 'Clarity'],
  },
  {
    name: 'Selenite',
    canonicalName: 'Gypsum var. selenite',
    nomenclature: 'mineral',
    form: 'crystal',
    description: 'Clear bladed gypsum. Dissolves in water, so it is never charged in it.',
    element: 'spirit',
    categories: ['Cleansing', 'Purification'],
    folkNames: ['Satin Spar'],
  },
  {
    // A rock rather than a species; the mineral system covers it too.
    name: 'Lapis Lazuli',
    canonicalName: 'Lapis lazuli',
    nomenclature: 'mineral',
    form: 'stone',
    description: 'Lazurite-bearing rock flecked with pyrite.',
    element: 'air',
    categories: ['Truth', 'Wisdom'],
  },
  {
    name: 'Sea Salt',
    canonicalName: 'Sodium chloride',
    nomenclature: 'chemical',
    form: 'salt',
    description: 'Coarse grey salt, evaporated rather than mined.',
    element: 'water',
    categories: ['Cleansing', 'Warding'],
  },
  {
    name: 'Saltpetre',
    canonicalName: 'Potassium nitrate',
    nomenclature: 'chemical',
    form: 'powder',
    description: 'White crystalline powder, ground fine.',
    element: 'fire',
    safetyNotes: 'An oxidiser. Kept away from anything that burns.',
    categories: ['Uncrossing', 'Reversal'],
  },
  {
    // `none` is a positive claim: no naming system names this thing.
    name: 'Graveyard Dirt',
    nomenclature: 'none',
    form: 'earth',
    description: 'Dirt taken from a grave, paid for at the gate.',
    element: 'earth',
    categories: ['Ancestor Work', 'Spirit Work'],
  },
  {
    name: 'Moon Water',
    nomenclature: 'none',
    form: 'water',
    description: 'Water left out under a full moon.',
    element: 'water',
    categories: ['Psychic Work', 'Divination'],
  },
  {
    // A preparation rather than a substance, which is why no system names it.
    name: 'Black Salt',
    nomenclature: 'none',
    form: 'salt',
    description: 'Salt blackened with ash, scraped soot or ground charcoal.',
    element: 'earth',
    categories: ['Banishing', 'Warding'],
  },
  {
    // `unknown`, not `none`: there is a plant behind the name and nobody has
    // looked it up — the curation to-do row.
    name: "Devil's Shoestring",
    nomenclature: 'unknown',
    form: 'root',
    description: 'Wiry root cut into lengths, tied and carried.',
    element: 'earth',
    categories: ['Protection', 'Gambling'],
    folkNames: ['Devil Shoestrings'],
  },
  {
    // The uncurated form: `rhizome` is nowhere in the curated 78, and `form` is
    // free text so this row can exist before it is.
    name: 'Ginger',
    canonicalName: 'Zingiber officinale',
    nomenclature: 'botanical',
    form: 'rhizome',
    description: 'Fresh knobbed rhizome, sliced and dried.',
    element: 'fire',
    planet: 'Mars',
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
 * published and the bootstrap admin exists.
 */
export async function seedStandardContent(tx: SeedTransaction): Promise<void> {
  // Reference data first: an ingredient is filed under a category by foreign
  // key. Inside this transaction so a scenario is never half-applied.
  await seedFormVocabulary(tx);
  await seedCategoryVocabulary(tx);

  await insertMissingUsers(tx);
  await insertMissingWorkspaces(tx);
  await insertMissingMemberships(tx);

  const ingredientIds = await insertMissingIngredients(tx);
  await insertMissingFolkNames(tx, ingredientIds);
  await insertMissingCategoryAssignments(tx, ingredientIds, await categoryIdByName(tx));
}

// Idempotent the way seedCategories is: inserts what is missing by identity,
// ignoring `deleted_at` so a soft-deleted entry is not quietly restored, and
// updates nothing already present.

async function insertMissingUsers(tx: SeedTransaction): Promise<void> {
  const wanted = Object.values(FIXTURE_USERS);

  await insertMissing(tx, users, wanted, {
    existing: async (tx) =>
      (
        await tx
          .select({ id: users.id })
          .from(users)
          .where(
            inArray(
              users.id,
              wanted.map((user) => user.id),
            ),
          )
      ).map((row) => row.id),
    keyOf: (user) => user.id,
    toRow: (user) => user,
  });
}

async function insertMissingWorkspaces(tx: SeedTransaction): Promise<void> {
  await insertMissing(tx, workspaces, FIXTURE_WORKSPACES, {
    existing: async (tx) =>
      (
        await tx
          .select({ id: workspaces.id })
          .from(workspaces)
          .where(
            inArray(
              workspaces.id,
              FIXTURE_WORKSPACES.map((workspace) => workspace.id),
            ),
          )
      ).map((row) => row.id),
    keyOf: (workspace) => workspace.id,
    toRow: (workspace) => ({ ...workspace, slug: slugify(workspace.name) }),
  });
}

async function insertMissingMemberships(tx: SeedTransaction): Promise<void> {
  await insertMissing(tx, workspaceMembers, MEMBERSHIPS, {
    existing: async (tx) =>
      (
        await tx
          .select({ workspaceId: workspaceMembers.workspaceId, userId: workspaceMembers.userId })
          .from(workspaceMembers)
      ).map((row) => `${row.workspaceId}|${row.userId}`),
    keyOf: (membership) => `${membership.workspaceId}|${membership.userId}`,
    toRow: (membership) => membership,
  });
}

/**
 * Keys on the three columns `canonical_key` reads rather than recomputing the
 * expression in TypeScript. It says nothing about the tier, so a caller builds
 * its map from one tier's rows.
 */
export function identityOf(entry: {
  name: string;
  canonicalName?: string | null;
  form?: string | null;
}): string {
  return `${entry.name}|${entry.canonicalName ?? ''}|${entry.form ?? ''}`;
}

/**
 * Inserts what is missing and returns every seeded entry's id, by identity.
 * Not `insertMissing`: the one caller that needs the inserted rows back, and
 * `.returning()` for one caller is not worth a second helper.
 */
async function insertMissingIngredients(tx: SeedTransaction): Promise<Map<string, string>> {
  const existing = await tx
    .select({
      id: ingredients.id,
      name: ingredients.name,
      canonicalName: ingredients.canonicalName,
      form: ingredients.form,
    })
    .from(ingredients)
    .where(isNull(ingredients.workspaceId));

  const ids = new Map(existing.map((row) => [identityOf(row), row.id]));
  const missing = COMPENDIUM_INGREDIENTS.filter((entry) => !ids.has(identityOf(entry)));

  if (missing.length > 0) {
    const inserted = await tx
      .insert(ingredients)
      .values(
        missing.map(({ folkNames: _folkNames, categories: _categories, ...entry }) =>
          applyAudit('insert', entry, BOOTSTRAP_SESSION),
        ),
      )
      .returning({
        id: ingredients.id,
        name: ingredients.name,
        canonicalName: ingredients.canonicalName,
        form: ingredients.form,
      });

    for (const row of inserted) ids.set(identityOf(row), row.id);
  }

  return ids;
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
  await insertMissing(tx, ingredientFolkNames, wanted, {
    existing: async (tx) =>
      (
        await tx
          .select({
            ingredientId: ingredientFolkNames.ingredientId,
            name: ingredientFolkNames.name,
          })
          .from(ingredientFolkNames)
      ).map((row) => `${row.ingredientId}|${row.name.toLowerCase()}`),
    keyOf: (folkName) => `${folkName.ingredientId}|${folkName.name.toLowerCase()}`,
    toRow: (folkName) => folkName,
  });
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

  // Hard-deleted (MB.34): the four-column stamp set, so `applyAudit` stamps
  // fewer columns.
  await insertMissing(tx, ingredientCategories, wanted, {
    existing: async (tx) =>
      (
        await tx
          .select({
            ingredientId: ingredientCategories.ingredientId,
            categoryId: ingredientCategories.categoryId,
          })
          .from(ingredientCategories)
      ).map((row) => `${row.ingredientId}|${row.categoryId}`),
    keyOf: (assignment) => `${assignment.ingredientId}|${assignment.categoryId}`,
    toRow: (assignment) => assignment,
  });
}
