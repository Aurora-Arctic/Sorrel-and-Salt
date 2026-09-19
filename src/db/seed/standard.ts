import { inArray, isNull, sql } from 'drizzle-orm';
// `./bootstrap-admin` first, and load-bearing — see minimal.ts.
import { BOOTSTRAP_SESSION, insertBootstrapAdmin } from './bootstrap-admin';
import { users } from '../schema/users';
import { workspaceMembers, workspaces } from '../schema/workspaces';
import { ingredients } from '../schema/ingredients';
import { ingredientFolkNames } from '../schema/ingredient-folk-names';
import { ingredientCategories } from '../schema/ingredient-categories';
import { applyAudit } from '../audit';
import { BOOTSTRAP_USER_ID } from '../bootstrap';
import { slugify } from '../../lib/slugify';
import { categoryIdByName, seedCategoryVocabulary } from './categories';
import { seedFormVocabulary } from './forms';
import type { SeedDatabase, SeedTransaction } from './index';

// The `standard` scenario (DESIGN.md §"Seed data"): five fixture users,
// workspaces W and X, and a populated compendium. The fixture every
// authorization test reads against, which is why the cast is fixed rather than
// generated — `asUser(A)` means the same person in every suite.
//
// **The compendium here is deliberately awkward**, because a clean list of
// herbs would exercise nothing the identity model exists for: five rows
// labelled "Cat's Claw", a mineral *variety*, a `none` and an `unknown`, and
// one in-use `form` nobody has curated. M4.7/M4.7a and M8.3/M8.3a resolve
// against these rows and none of them can be tested against tidy data
// (claude-docs/db.md, "The compendium is awkward on purpose").
//
// The writes go through the handle `seed()` was given rather than through
// `withAudit` (claude-docs/design-decisions/m1.21-seed-writes-through-its-handle.md).

/**
 * Typed against the table's own insert model, so a column renamed in users.ts
 * fails here rather than at the first seed. `id` is restated as required rather
 * than picked: the table defaults it, so the insert model makes it optional,
 * and a test asserting against A has to name one id rather than whichever UUID
 * this run generated. `…0003`–`…0007` continue the bootstrap's series.
 */
type SeedUser = Pick<
  typeof users.$inferInsert,
  'name' | 'email' | 'role' | 'canCreateWorkspace'
> & { id: string };

/**
 * DESIGN.md §"Seed data"'s fixture table: A owns W, B is a member of W, C a
 * viewer in W, D a member of unrelated X, E a site admin in no workspace.
 *
 * `canCreateWorkspace` follows the invite gate rather than convenience. A–D are
 * in a workspace, which is how the flag comes to be true; E has never been
 * invited, so E's false flag is correct and E creates workspaces by being an
 * admin instead. Seeding E `true` would hide the distinction M3.2 turns on.
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

// No slug is written down, per CLAUDE.md's slug rule. Exported beside
// `FIXTURE_USERS` because the M1.25 factories have to know what W and X are
// called, so their own defaults can be neither.
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
  // E is deliberately absent. "A site admin has no access to any workspace's
  // ingredients or grimoire" (CLAUDE.md) is only assertable against an admin
  // who is in no workspace.
];

/**
 * One compendium entry, typed against the table's own insert model, plus the
 * two things that live in other tables: its folk names and the categories it is
 * filed under, named rather than keyed.
 */
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
 * The compendium `standard` populates. Every entry declares a `nomenclature`,
 * and the awkward ones are the point: five rows labelled **Cat's Claw** told
 * apart only by `canonicalKey`, two **mineral varieties**, three **`none`**
 * entries and one **`unknown`**, one **uncurated form** (`rhizome`), and
 * **comfrey beside foxglove**, both `leaf`, one of which carries a safety note
 * that matters.
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
    // The cultivar case: same species as the row above, and a different entry,
    // because `canonicalName` is the most specific accepted name at the
    // granularity the entry exists at (§5).
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
    // Not a plant at all — §5's own example of why the display label cannot
    // carry identity.
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
    // A rock rather than a species, which the mineral system covers too (§5).
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
    // `unknown`, not `none`: there *is* a plant behind the name — story 21's
    // own example says honeysuckle root — and nobody has looked it up. This is
    // the row `where nomenclature = 'unknown'` returns as a curation to-do.
    name: "Devil's Shoestring",
    nomenclature: 'unknown',
    form: 'root',
    description: 'Wiry root cut into lengths, tied and carried.',
    element: 'earth',
    categories: ['Protection', 'Gambling'],
    folkNames: ['Devil Shoestrings'],
  },
  {
    // The uncurated form. `rhizome` is nowhere in M4.3a's 78, and that is the
    // point: `ingredients.form` is free text precisely so this row can exist
    // before an admin decides whether to curate the word.
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
  await db.transaction(async (tx) => {
    // Published exactly as withAudit publishes it: `set_config` with a bind
    // parameter, transaction-local.
    await tx.execute(sql`select set_config('app.current_user_id', ${BOOTSTRAP_USER_ID}, true)`);
    await insertBootstrapAdmin(tx);
    await seedStandardContent(tx);
  });
}

/**
 * The same scenario, inside a transaction the caller already opened — the only
 * reason it is separate. `demo` is "standard plus spells", so it writes its
 * grimoire alongside these rows: a compendium seeded without the spells that
 * reference it is worse than a scenario that never ran.
 *
 * It assumes what `seedStandard` does for itself: the GUC is published and the
 * bootstrap admin exists, since every row here is stamped as that user's.
 */
export async function seedStandardContent(tx: SeedTransaction): Promise<void> {
  // The admin-curated reference data first: an ingredient is filed under a
  // category by foreign key, so those rows have to exist before this scenario's
  // assignments can point at them. Inside this transaction rather than by
  // calling `seedCategories(db)`, so a scenario is never half-applied.
  await seedFormVocabulary(tx);
  await seedCategoryVocabulary(tx);

  await insertMissingUsers(tx);
  await insertMissingWorkspaces(tx);
  await insertMissingMemberships(tx);

  const ingredientIds = await insertMissingIngredients(tx);
  await insertMissingFolkNames(tx, ingredientIds);
  await insertMissingCategoryAssignments(tx, ingredientIds, await categoryIdByName(tx));
}

// Idempotent the way seedCategories is: it inserts what is missing, keyed on
// identity, and **ignores `deleted_at`** — the partial unique indexes stop only
// a second *live* row, so a soft-deleted entry would otherwise be re-inserted
// and the deletion quietly undone. Nothing already present is updated either.

async function insertMissingUsers(tx: SeedTransaction): Promise<void> {
  const present = new Set(
    (
      await tx
        .select({ id: users.id })
        .from(users)
        .where(
          inArray(
            users.id,
            Object.values(FIXTURE_USERS).map((user) => user.id),
          ),
        )
    ).map((row) => row.id),
  );
  const missing = Object.values(FIXTURE_USERS).filter((user) => !present.has(user.id));

  if (missing.length === 0) return;

  await tx
    .insert(users)
    .values(missing.map((user) => applyAudit('insert', user, BOOTSTRAP_SESSION)));
}

async function insertMissingWorkspaces(tx: SeedTransaction): Promise<void> {
  const present = new Set(
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
  );
  const missing = FIXTURE_WORKSPACES.filter((workspace) => !present.has(workspace.id));

  if (missing.length === 0) return;

  await tx
    .insert(workspaces)
    .values(
      missing.map((workspace) =>
        applyAudit('insert', { ...workspace, slug: slugify(workspace.name) }, BOOTSTRAP_SESSION),
      ),
    );
}

async function insertMissingMemberships(tx: SeedTransaction): Promise<void> {
  const present = new Set(
    (
      await tx
        .select({ workspaceId: workspaceMembers.workspaceId, userId: workspaceMembers.userId })
        .from(workspaceMembers)
    ).map((row) => `${row.workspaceId}|${row.userId}`),
  );
  const missing = MEMBERSHIPS.filter(
    (membership) => !present.has(`${membership.workspaceId}|${membership.userId}`),
  );

  if (missing.length === 0) return;

  await tx
    .insert(workspaceMembers)
    .values(missing.map((membership) => applyAudit('insert', membership, BOOTSTRAP_SESSION)));
}

/**
 * Keys on the three columns `canonical_key`'s generated expression reads,
 * rather than recomputing that expression in TypeScript: a second
 * implementation of §5's normalisation is a second thing to keep in step.
 *
 * It says nothing about the tier — `workspace_id` is what tells a local entry
 * from a compendium one — so a caller builds its map from one tier's rows,
 * never from both at once.
 */
export function identityOf(entry: {
  name: string;
  canonicalName?: string | null;
  form?: string | null;
}): string {
  return `${entry.name}|${entry.canonicalName ?? ''}|${entry.form ?? ''}`;
}

/** Inserts what is missing and returns every seeded entry's id, by identity. */
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

/**
 * The id a seeded entry landed under. Unreachable today — but a lookup that
 * silently returned `undefined` would insert a null `ingredient_id` and fail
 * NOT NULL several rows later, naming the wrong row.
 */
function ingredientIdFor(entry: SeedIngredient, ingredientIds: Map<string, string>): string {
  const id = ingredientIds.get(identityOf(entry));

  if (id === undefined) {
    throw new Error(`Compendium entry ${entry.name} was neither found nor inserted.`);
  }

  return id;
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

  const present = new Set(
    (
      await tx
        .select({ ingredientId: ingredientFolkNames.ingredientId, name: ingredientFolkNames.name })
        .from(ingredientFolkNames)
    ).map((row) => `${row.ingredientId}|${row.name.toLowerCase()}`),
  );
  // Folded case-insensitively because the unique index is on `lower(name)`: a
  // second spelling of one name is a mistake within one ingredient's own list.
  const missing = wanted.filter(
    (folkName) => !present.has(`${folkName.ingredientId}|${folkName.name.toLowerCase()}`),
  );

  if (missing.length === 0) return;

  await tx
    .insert(ingredientFolkNames)
    .values(missing.map((folkName) => applyAudit('insert', folkName, BOOTSTRAP_SESSION)));
}

async function insertMissingCategoryAssignments(
  tx: SeedTransaction,
  ingredientIds: Map<string, string>,
  categoryIds: Map<string, string>,
): Promise<void> {
  const wanted = COMPENDIUM_INGREDIENTS.flatMap((entry) =>
    entry.categories.map((name) => {
      const categoryId = categoryIds.get(name);

      // Unreachable while these entries and §6's vocabulary agree, which the
      // tests pin — but an entry naming a category an admin has since renamed
      // or deleted would otherwise be inserted with `undefined` and fail on
      // NOT NULL several rows later, naming the wrong row.
      if (categoryId === undefined) {
        throw new Error(`"${entry.name}" names category "${name}", which is not in the database.`);
      }

      return { ingredientId: ingredientIdFor(entry, ingredientIds), categoryId };
    }),
  );

  const present = new Set(
    (
      await tx
        .select({
          ingredientId: ingredientCategories.ingredientId,
          categoryId: ingredientCategories.categoryId,
        })
        .from(ingredientCategories)
    ).map((row) => `${row.ingredientId}|${row.categoryId}`),
  );
  const missing = wanted.filter(
    (assignment) => !present.has(`${assignment.ingredientId}|${assignment.categoryId}`),
  );

  if (missing.length === 0) return;

  // `ingredient_categories` is hard-deleted (MB.34), so these carry the
  // four-column stamp set and `applyAudit` simply stamps fewer columns.
  await tx
    .insert(ingredientCategories)
    .values(missing.map((assignment) => applyAudit('insert', assignment, BOOTSTRAP_SESSION)));
}
