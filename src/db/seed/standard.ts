import { eq, inArray, isNull, max } from 'drizzle-orm';
import { BOOTSTRAP_SESSION } from './bootstrap-admin';
import { users } from '../../modules/identity/schema/users';
import { adminRoleChanges } from '../../modules/identity/schema/admin-role-changes';
import { workspaceMembers, workspaces } from '../../modules/coven/schema/workspaces';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import { ingredientDeities } from '../../modules/ingredients/schema/ingredient-deities';
import { ingredientFolkNames } from '../../modules/ingredients/schema/ingredient-folk-names';
import { ingredientCategories } from '../../modules/ingredients/schema/ingredient-categories';
import { deities } from '../../modules/vocabulary/schema/deities';
import { ingredientForms } from '../../modules/vocabulary/schema/ingredient-forms';
import { applyAudit } from '../audit';
import { ingredientSlug, slugify } from '../../lib/slugify';
import { categoryIdByName, seedCategoryVocabulary } from './categories';
import { seedAstrologyVocabularies } from './astrology';
import { seedDeityVocabulary } from './deities';
import { seedVocabularySources } from './sources';
import { seedFormVocabulary } from './forms';
import { beginSeedTransaction, insertMissing, requireFrom } from './idempotent';
import type {
  FixtureUser,
  SeedDatabase,
  SeedIngredient,
  SeedMembership,
  SeedTransaction,
  SeedWorkspace,
} from './types';

// The `standard` scenario: five fixture users, workspaces W and X, and a
// populated compendium. The cast is fixed, not generated, so `asUser(A)` is the
// same person in every suite. The compendium is deliberately awkward — five
// "Cat's Claw" rows, mineral varieties, `none` and `unknown` — because tidy
// data exercises nothing the identity model exists for
// (claude-docs/db/standard-scenario.md, "The compendium is awkward on purpose"). Writes go through
// the handle `seed()` was given, not `withAudit` — see minimal.ts.

/**
 * A owns W, B is a member of W, C a viewer in W, D a member of unrelated X, E a
 * site admin in no workspace. `canCreateWorkspace` follows the invite gate: A–D
 * earned it by membership, and E, never invited, holds it as an admin, since the
 * users CHECK requires it of every admin (MB.177). `…0003`–`…0007` continue the
 * bootstrap's series.
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
} satisfies Record<'A' | 'B' | 'C' | 'D' | 'E', FixtureUser>;

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
  // E is deliberately absent: "an admin has no access to any workspace" is
  // only assertable against one in no workspace.
];

/**
 * Every entry declares a `nomenclature`. The awkward ones are the point: five
 * "Cat's Claw" rows told apart only by `canonicalKey`, two mineral varieties,
 * three `none` and one `unknown`, two entries worked with more than one
 * element, and comfrey beside foxglove, one carrying a safety note that
 * matters. Every form, planet, zodiac sign and deity names a curated row in
 * that row's own spelling (MB.162); the uncurated `rhizome` is a coven's, in
 * demo.ts.
 */
export const COMPENDIUM_INGREDIENTS: SeedIngredient[] = [
  {
    name: 'Mugwort',
    canonicalName: 'Artemisia vulgaris',
    nomenclature: 'botanical',
    form: 'Herb',
    description: 'Silver-backed leaves cut with the flowering stem, dried for smoke and tea.',
    elements: ['air', 'earth'],
    planets: ['Moon'],
    deities: ['Artemis', 'Diana'],
    categories: ['Dream Work', 'Divination', 'Psychic Work'],
    folkNames: ['Cronewort', "Sailor's Tobacco", 'Felon Herb'],
  },
  {
    name: 'Wormwood',
    canonicalName: 'Artemisia absinthium',
    nomenclature: 'botanical',
    form: 'Herb',
    description: 'Bitter grey-green herb, the other Artemisia — and not interchangeable.',
    elements: ['fire'],
    planets: ['Mars'],
    safetyNotes: 'Thujone. Not for internal use in any quantity, and never in pregnancy.',
    categories: ['Banishing', 'Spirit Work'],
    folkNames: ['Green Ginger', 'Absinthium'],
  },
  {
    name: 'Bay Laurel',
    canonicalName: 'Laurus nobilis',
    nomenclature: 'botanical',
    form: 'Leaf',
    description: 'Whole leaves, written on and burned for a wish.',
    elements: ['fire'],
    planets: ['Sun'],
    zodiacSigns: ['Leo'],
    deities: ['Apollo'],
    categories: ['Success', 'Protection', 'Clarity'],
    folkNames: ['Sweet Bay', 'Bay'],
  },
  {
    name: 'Rosemary',
    canonicalName: 'Salvia rosmarinus',
    nomenclature: 'botanical',
    form: 'Herb',
    description: 'Needled sprigs. Renamed out of Rosmarinus in 2017, which is why the label moves.',
    elements: ['fire'],
    planets: ['Sun'],
    categories: ['Protection', 'Memory', 'Cleansing'],
    folkNames: ['Dew of the Sea', 'Compass Weed'],
  },
  {
    name: 'Lavender',
    canonicalName: 'Lavandula angustifolia',
    nomenclature: 'botanical',
    form: 'Flower',
    description: 'Buds stripped from the stem.',
    elements: ['air'],
    planets: ['Mercury'],
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
    form: 'Flower',
    description: 'A dark-flowered cultivar, kept separate from the species it belongs to.',
    elements: ['air'],
    planets: ['Mercury'],
    categories: ['Peace', 'Sleep'],
  },
  {
    name: 'Comfrey',
    canonicalName: 'Symphytum officinale',
    nomenclature: 'botanical',
    form: 'Leaf',
    description: 'Broad hairy leaves, dried flat.',
    elements: ['water'],
    planets: ['Saturn'],
    safetyNotes:
      'Confused with foxglove leaf in the field, which is fatal. Check the flower before cutting.',
    categories: ['Healing', 'Safe Travel'],
    folkNames: ['Knitbone', 'Boneset'],
  },
  {
    name: 'Foxglove',
    canonicalName: 'Digitalis purpurea',
    nomenclature: 'botanical',
    form: 'Leaf',
    description: 'The other broad hairy leaf, and the reason the compendium demands a formal name.',
    elements: ['water'],
    planets: ['Venus'],
    safetyNotes: 'Cardiac glycosides. Never ingested, never infused, and handled with gloves.',
    categories: ['Spirit Work'],
    folkNames: ["Witches' Gloves", "Dead Man's Bells"],
  },
  {
    name: "Cat's Claw",
    canonicalName: 'Uncaria tomentosa',
    nomenclature: 'botanical',
    form: 'Bark',
    description: 'Inner bark of the Amazonian vine.',
    elements: ['earth'],
    categories: ['Healing', 'Strength'],
    folkNames: ['Uña de Gato', 'Vilcacora'],
  },
  {
    name: "Cat's Claw",
    canonicalName: 'Uncaria guianensis',
    nomenclature: 'botanical',
    form: 'Bark',
    description: 'The other Uncaria sold under the same name, and not the same plant.',
    elements: ['earth'],
    categories: ['Healing'],
    folkNames: ['Uña de Gato'],
  },
  {
    name: "Cat's Claw",
    canonicalName: 'Senegalia greggii',
    nomenclature: 'botanical',
    form: 'Thorn',
    description: 'Hooked thorns off the desert acacia. Renamed out of Acacia, like two of its kin.',
    elements: ['earth'],
    categories: ['Binding', 'Protection'],
    folkNames: ['Catclaw Acacia', 'Wait-a-Minute Bush'],
  },
  {
    name: "Cat's Claw",
    canonicalName: 'Dolichandra unguis-cati',
    nomenclature: 'botanical',
    form: 'Leaf',
    description: 'A climbing vine whose tendrils hook like claws.',
    elements: ['earth'],
    categories: ['Binding'],
  },
  {
    // Not a plant at all — why the display label cannot carry identity.
    name: "Cat's Claw",
    canonicalName: 'Felis catus',
    nomenclature: 'zoological',
    form: 'Claw',
    description: 'A claw, shed or clipped, kept from a household cat.',
    elements: ['spirit'],
    categories: ['Familiar Work', 'Protection'],
  },
  {
    name: 'Beeswax',
    canonicalName: 'Apis mellifera',
    nomenclature: 'zoological',
    form: 'Wax',
    description: 'Comb rendered and strained, still smelling of the hive.',
    elements: ['earth'],
    planets: ['Venus'],
    categories: ['Abundance', 'Home Blessing'],
  },
  {
    name: 'Reishi',
    canonicalName: 'Ganoderma lingzhi',
    nomenclature: 'fungal',
    form: 'Mushroom',
    description: 'Lacquered shelf fungus, sliced and dried.',
    elements: ['earth'],
    categories: ['Longevity', 'Wisdom'],
    folkNames: ['Lingzhi', 'Mushroom of Immortality'],
  },
  {
    name: 'Fly Agaric',
    canonicalName: 'Amanita muscaria',
    nomenclature: 'fungal',
    form: 'Mushroom',
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
    form: 'Crystal',
    description: 'Purple quartz, a variety rather than a species of its own.',
    elements: ['water'],
    categories: ['Intuition', 'Sleep', 'Clarity'],
  },
  {
    name: 'Selenite',
    canonicalName: 'Gypsum var. selenite',
    nomenclature: 'mineral',
    form: 'Crystal',
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
    form: 'Stone',
    description: 'Lazurite-bearing rock flecked with pyrite.',
    elements: ['air'],
    categories: ['Truth', 'Wisdom'],
  },
  {
    name: 'Sea Salt',
    canonicalName: 'Sodium chloride',
    nomenclature: 'chemical',
    form: 'Salt',
    description: 'Coarse grey salt, evaporated rather than mined.',
    elements: ['water', 'earth'],
    categories: ['Cleansing', 'Warding'],
  },
  {
    name: 'Saltpetre',
    canonicalName: 'Potassium nitrate',
    nomenclature: 'chemical',
    form: 'Powder',
    description: 'White crystalline powder, ground fine.',
    elements: ['fire'],
    safetyNotes: 'An oxidiser. Kept away from anything that burns.',
    categories: ['Uncrossing', 'Reversal'],
  },
  {
    // `none` is a positive claim: no naming system names this thing.
    name: 'Graveyard Dirt',
    nomenclature: 'none',
    form: 'Earth',
    description: 'Dirt taken from a grave, paid for at the gate.',
    elements: ['earth'],
    categories: ['Ancestor Work', 'Spirit Work'],
  },
  {
    name: 'Moon Water',
    nomenclature: 'none',
    form: 'Water',
    description: 'Water left out under a full moon.',
    elements: ['water'],
    categories: ['Psychic Work', 'Divination'],
  },
  {
    // A preparation rather than a substance, which is why no system names it.
    name: 'Black Salt',
    nomenclature: 'none',
    form: 'Salt',
    description: 'Salt blackened with ash, scraped soot or ground charcoal.',
    elements: ['earth'],
    categories: ['Banishing', 'Warding'],
  },
  {
    // `unknown`, not `none`: there is a plant behind the name and nobody has
    // looked it up — the curation to-do row.
    name: "Devil's Shoestring",
    nomenclature: 'unknown',
    form: 'Root',
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
    form: 'Root',
    description: 'Knobbed root, sliced and dried.',
    elements: ['fire'],
    planets: ['Mars'],
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
  await insertMissingAdminBootstrap(tx);
  await insertMissingWorkspaces(tx);
  await insertMissingMemberships(tx);

  const ingredientIds = await insertMissingIngredients(tx);
  await insertMissingFolkNames(tx, ingredientIds);
  await insertMissingDeities(tx, ingredientIds, restoreDeletedDeityPicks);
  await insertMissingCategoryAssignments(tx, ingredientIds, await categoryIdByName(tx));
}

/**
 * The live rows of a two-tier vocabulary by folded name, for the compendium's
 * picks (MB.167): every compendium form and deity is a pick of a curated row,
 * as an admin's would be. A name two live rows share has no one row to pick,
 * so it is thrown rather than guessed; the literal then names its row.
 */
async function pickedIdByName(
  tx: SeedTransaction,
  table: typeof ingredientForms | typeof deities,
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

// Fixture E's ledger row, as MB.58's migration writes one for every admin a
// database already holds: one `bootstrap` row, stamped as E. Not
// `insertMissing`, which stamps as the bootstrap user.
async function insertMissingAdminBootstrap(tx: SeedTransaction): Promise<void> {
  const admin = FIXTURE_USERS.E.id;
  const [present] = await tx
    .select({ id: adminRoleChanges.id })
    .from(adminRoleChanges)
    .where(eq(adminRoleChanges.userId, admin))
    .limit(1);
  if (present) return;

  await tx
    .insert(adminRoleChanges)
    .values(
      applyAudit('insert', { userId: admin, change: 'bootstrap' as const }, { userId: admin }),
    );
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
 * expression in TypeScript. The form alone is folded as the key folds it: a
 * database seeded before MB.162 spelt the compendium's forms lower-case, and
 * keyed on the spelling a reseed would insert each entry beside itself and fail
 * on the canonical-key index. It says nothing about the tier, so a caller
 * builds its map from one tier's rows.
 */
export function identityOf(entry: {
  name: string;
  canonicalName?: string | null;
  form?: string | null;
}): string {
  return `${entry.name}|${entry.canonicalName ?? ''}|${entry.form?.trim().toLowerCase() ?? ''}`;
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
    const formIds = await pickedIdByName(tx, ingredientForms);
    const inserted = await tx
      .insert(ingredients)
      .values(
        missing.map(
          ({ folkNames: _folkNames, categories: _categories, deities: _deities, ...entry }) =>
            applyAudit(
              'insert',
              {
                ...entry,
                formId: entry.form ? pickOf(formIds, entry.form, 'form') : null,
                slug: ingredientSlug(entry.name, entry.form, entry.canonicalName),
              },
              BOOTSTRAP_SESSION,
            ),
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

/**
 * Each entry's deities, picked in the literal's order. Keyed on the case-folded
 * name the row holds rather than the pick, over the live rows: a database that
 * ran MB.166's fill already holds these deities as typed names at these
 * positions, and a pick beside each would take a position its typed twin
 * holds. Over every row instead when `restoreDeleted` is off, so a deleted
 * pick counts as present.
 *
 * A missing pick goes after every live pick of its entry, in the literal's
 * order, rather than at its literal index (MB.192): the service renumbers the
 * picks it keeps, so a pick removed from anywhere but the end leaves its index
 * held by the pick below it. On an entry with no live pick that is the literal
 * index, and no live row moves, so a second run moves nothing —
 * claude-docs/db/standard-scenario.md.
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

  await insertMissing(tx, ingredientDeities, wanted, {
    existing: async (tx) =>
      (
        await tx
          .select({ ingredientId: ingredientDeities.ingredientId, name: ingredientDeities.name })
          .from(ingredientDeities)
          .where(restoreDeleted ? isNull(ingredientDeities.deletedAt) : undefined)
      ).map((row) => `${row.ingredientId}|${row.name.toLowerCase()}`),
    keyOf: (deity) => `${deity.ingredientId}|${deity.name.toLowerCase()}`,
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
