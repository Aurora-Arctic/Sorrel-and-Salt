import { eq, inArray, isNull, sql } from 'drizzle-orm';
// `./bootstrap-admin` first, and load-bearing — see minimal.ts.
import { BOOTSTRAP_SESSION, insertBootstrapAdmin } from './bootstrap-admin';
import { ingredients } from '../schema/ingredients';
import { spells } from '../schema/spells';
import { spellCategories } from '../schema/spell-categories';
import { spellIngredients } from '../schema/spell-ingredients';
import { applyAudit } from '../audit';
import { BOOTSTRAP_USER_ID } from '../bootstrap';
import { categoryIdByName } from './categories';
import {
  COMPENDIUM_INGREDIENTS,
  WORKSPACE_W_ID,
  identityOf,
  seedStandardContent,
} from './standard';
import type { SeedDatabase, SeedTransaction } from './index';

// The `demo` scenario (DESIGN.md §"Seed data"): "standard plus spells with
// ingredients and layer order". The scenario a screenshot is taken against,
// which is why the jars below are written as a member would write them rather
// than generated as "Spell 1" through "Spell 3".
//
// It adds two things `standard` does not have: **W's own ingredients**, so the
// jars mix §5's two tiers the way a real one does; and **a custom, one-off
// layer** (MB.40, story 57) — a name written for one jar, with no
// `ingredient_id`, which never becomes an ingredient anywhere.
//
// The writes go through the handle `seed()` was given rather than through
// `withAudit` (claude-docs/design-decisions/m1.21-seed-writes-through-its-handle.md).

/** W's own ingredients — the workspace tier, `workspace_id` set rather than null. */
type SeedWorkspaceIngredient = Pick<
  typeof ingredients.$inferInsert,
  'name' | 'canonicalName' | 'nomenclature' | 'form' | 'description' | 'element'
>;

/**
 * Rosemary the coven grows, beside the compendium's own entry for the same
 * species. **The duplication is the fixture** — the pair M8.3's
 * local-beats-compendium resolution has to collapse. The two share an identity,
 * which the two partial unique indexes permit because they are in different
 * tiers.
 */
const GARDEN_ROSEMARY: SeedWorkspaceIngredient = {
  name: 'Garden Rosemary',
  canonicalName: 'Salvia rosmarinus',
  nomenclature: 'botanical',
  form: 'herb',
  description: 'Cut from the bush by the back door, dried in bunches over the stove.',
  element: 'fire',
};

/**
 * Story 29's one-field stub, near enough: a thing this household keeps that no
 * naming system names, so `nomenclature` is `none`. The local tier is where a
 * row like this is allowed to live.
 */
const HEARTH_ASH: SeedWorkspaceIngredient = {
  name: 'Hearth Ash',
  nomenclature: 'none',
  form: 'ash',
  description: 'Swept cold from the grate after a Yule fire and kept in a tin.',
  element: 'fire',
};

const HOUSE_CHAMOMILE: SeedWorkspaceIngredient = {
  name: 'House Chamomile',
  canonicalName: 'Matricaria chamomilla',
  nomenclature: 'botanical',
  form: 'flower',
  description: 'Heads picked through the summer and dried on a screen.',
  element: 'water',
};

/** Everything W keeps of its own. Seeded into W, and invisible from X. */
export const WORKSPACE_W_INGREDIENTS: SeedWorkspaceIngredient[] = [
  GARDEN_ROSEMARY,
  HEARTH_ASH,
  HOUSE_CHAMOMILE,
];

/**
 * What a layer points at: an ingredient in one of the two tiers, or nothing at
 * all — the custom row, which carries its own name and form instead.
 */
type SeedLayerIngredient =
  | {
      tier: 'compendium' | 'workspace';
      entry: { name: string; canonicalName?: string | null; form?: string | null };
    }
  | { tier: 'custom'; name: string; form: string };

/**
 * One layer of a jar. `layerOrder` is deliberately not a picked column: it is
 * the position in the array below, so the two cannot disagree and a layer
 * cannot be given the same depth as its neighbour.
 */
type SeedLayer = Pick<typeof spellIngredients.$inferInsert, 'quantity' | 'unit' | 'note'> & {
  ingredient: SeedLayerIngredient;
};

type SeedSpell = Pick<
  typeof spells.$inferInsert,
  | 'title'
  | 'intent'
  | 'jarSize'
  | 'sealWaxColor'
  | 'moonPhase'
  | 'dayOfWeek'
  | 'instructions'
  | 'status'
> & {
  id: string;
  /** §6 categories by name — what the spell *intends*, never what its contents imply (§9). */
  categories: string[];
  layers: SeedLayer[];
};

/**
 * A compendium entry, named by what `standard` seeds rather than by a second
 * copy of its columns. The lookup runs at module load, so a layer naming an
 * entry the compendium does not carry fails on import — before a seed has
 * written anything — rather than at a foreign key several inserts later.
 */
function fromCompendium(name: string, canonicalName?: string): SeedLayerIngredient {
  const entry = COMPENDIUM_INGREDIENTS.find(
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

function fromWorkspace(entry: SeedWorkspaceIngredient): SeedLayerIngredient {
  return { tier: 'workspace', entry };
}

/** The jars. Fixed ids in a block of their own, `…0002-…`, after the users (`…0000-…`) and the workspaces (`…0001-…`). */
export const DEMO_SPELLS: SeedSpell[] = [
  {
    id: '00000000-0000-0000-0002-000000000001',
    title: 'Hearth Warding Jar',
    intent: 'Keep the house and everyone asleep in it from what walks the lane at night.',
    jarSize: '4 oz jar',
    sealWaxColor: 'Black',
    moonPhase: 'Waning crescent',
    dayOfWeek: 'Saturday',
    instructions:
      'Layer dry to damp, tamping each down before the next. Seal with black wax while it is still warm and bury it at the front step, upright.',
    status: 'complete',
    categories: ['Warding', 'Protection', 'Home Blessing'],
    layers: [
      {
        ingredient: fromCompendium('Sea Salt', 'Sodium chloride'),
        quantity: '2.000',
        unit: 'tbsp',
        note: 'The base. Everything above it sits on salt.',
      },
      {
        ingredient: fromCompendium('Black Salt'),
        quantity: '1.000',
        unit: 'tbsp',
        note: null,
      },
      {
        ingredient: fromWorkspace(HEARTH_ASH),
        quantity: '1.000',
        unit: 'pinch',
        note: 'From our own grate, which is the whole point of the jar.',
      },
      {
        // The custom, one-off layer (MB.40). Never an `ingredients` row, and
        // `dust` is nowhere in the curated forms — exactly as a member would
        // write it.
        ingredient: { tier: 'custom', name: 'Dust from the front step', form: 'dust' },
        quantity: '1.000',
        unit: 'pinch',
        note: 'Swept from our own doorstep at dusk. Not something to go on a shelf.',
      },
      {
        ingredient: fromWorkspace(GARDEN_ROSEMARY),
        quantity: null,
        unit: null,
        note: 'A sprig laid on top, whole, before the wax goes on.',
      },
    ],
  },
  {
    id: '00000000-0000-0000-0002-000000000002',
    title: 'Dreaming Sachet',
    intent: 'Sleep that answers a question, and is remembered in the morning.',
    jarSize: 'A palm-sized muslin bag',
    sealWaxColor: null,
    moonPhase: 'Full',
    dayOfWeek: 'Monday',
    instructions:
      'Crush the mugwort between your hands before it goes in. Stitch the bag closed and keep it inside the pillowcase; empty and refill it when it stops smelling of anything.',
    status: 'draft',
    categories: ['Dream Work', 'Sleep', 'Divination'],
    layers: [
      {
        ingredient: fromCompendium('Mugwort', 'Artemisia vulgaris'),
        quantity: '1.000',
        unit: 'tbsp',
        note: 'Too much and nobody sleeps at all.',
      },
      {
        ingredient: fromCompendium('Lavender', 'Lavandula angustifolia'),
        quantity: '2.000',
        unit: 'tsp',
        note: null,
      },
      {
        ingredient: fromWorkspace(HOUSE_CHAMOMILE),
        quantity: '2.000',
        unit: 'tsp',
        note: null,
      },
      {
        ingredient: fromCompendium('Amethyst', 'Quartz var. amethyst'),
        quantity: '1.000',
        unit: 'piece',
        note: 'A tumbled stone, small enough not to be felt through the pillow.',
      },
    ],
  },
];

export async function seedDemo(db: SeedDatabase): Promise<void> {
  await db.transaction(async (tx) => {
    // Published exactly as withAudit publishes it: `set_config` with a bind
    // parameter, transaction-local.
    await tx.execute(sql`select set_config('app.current_user_id', ${BOOTSTRAP_USER_ID}, true)`);
    await insertBootstrapAdmin(tx);

    // The plus is inside the same transaction: every spell below points at a
    // workspace, a category and — mostly — a compendium entry `standard`
    // writes, so a half-applied scenario is a grimoire referencing rows that
    // are not there.
    await seedStandardContent(tx);

    await insertMissingWorkspaceIngredients(tx);
    await insertMissingSpells(tx);

    const ingredientIds = await ingredientIdByIdentity(tx);
    await insertMissingLayers(tx, ingredientIds);
    await insertMissingSpellCategories(tx, await categoryIdByName(tx));
  });
}

// Idempotent the way `standard` is: it inserts what is missing, keyed on
// identity, and **ignores `deleted_at`** — the partial unique indexes stop only
// a second *live* row, so a soft-deleted spell would otherwise be re-inserted
// and the deletion quietly undone. Nothing already present is updated either.

async function insertMissingWorkspaceIngredients(tx: SeedTransaction): Promise<void> {
  const present = new Set(
    (
      await tx
        .select({
          name: ingredients.name,
          canonicalName: ingredients.canonicalName,
          form: ingredients.form,
        })
        .from(ingredients)
        .where(eq(ingredients.workspaceId, WORKSPACE_W_ID))
    ).map(identityOf),
  );
  const missing = WORKSPACE_W_INGREDIENTS.filter((entry) => !present.has(identityOf(entry)));

  if (missing.length === 0) return;

  await tx
    .insert(ingredients)
    .values(
      missing.map((entry) =>
        applyAudit('insert', { ...entry, workspaceId: WORKSPACE_W_ID }, BOOTSTRAP_SESSION),
      ),
    );
}

async function insertMissingSpells(tx: SeedTransaction): Promise<void> {
  const present = new Set(
    (
      await tx
        .select({ id: spells.id })
        .from(spells)
        .where(
          inArray(
            spells.id,
            DEMO_SPELLS.map((spell) => spell.id),
          ),
        )
    ).map((row) => row.id),
  );
  const missing = DEMO_SPELLS.filter((spell) => !present.has(spell.id));

  if (missing.length === 0) return;

  await tx
    .insert(spells)
    .values(
      missing.map(({ categories: _categories, layers: _layers, ...spell }) =>
        applyAudit('insert', { ...spell, workspaceId: WORKSPACE_W_ID }, BOOTSTRAP_SESSION),
      ),
    );
}

/**
 * Every id a layer below could name, keyed by `identityOf`. Both tiers in one
 * map, which is safe here and only here: the two share no identity except
 * Garden Rosemary's, whose local row wins — and a layer of W's jar naming
 * rosemary means W's rosemary, which is M8.3's rule from the other end.
 */
async function ingredientIdByIdentity(tx: SeedTransaction): Promise<Map<string, string>> {
  const rows = await tx
    .select({
      id: ingredients.id,
      name: ingredients.name,
      canonicalName: ingredients.canonicalName,
      form: ingredients.form,
      workspaceId: ingredients.workspaceId,
    })
    .from(ingredients)
    .where(isNull(ingredients.deletedAt));

  const ids = new Map<string, string>();
  // Compendium first, workspace second, so a local entry overwrites rather
  // than loses to the global one it shadows.
  for (const row of rows.filter((row) => row.workspaceId === null))
    ids.set(identityOf(row), row.id);
  for (const row of rows.filter((row) => row.workspaceId === WORKSPACE_W_ID))
    ids.set(identityOf(row), row.id);

  return ids;
}

/**
 * The id a layer's ingredient landed under. Unreachable today — but a lookup
 * that silently returned `undefined` would write a null `ingredient_id`, which
 * is a *custom* row under MB.40's CHECK, so the failure would be a blank-named
 * layer rather than an error.
 */
function ingredientIdFor(
  ingredient: SeedLayerIngredient & { tier: 'compendium' | 'workspace' },
  ingredientIds: Map<string, string>,
): string {
  const id = ingredientIds.get(identityOf(ingredient.entry));

  if (id === undefined) {
    throw new Error(`A demo layer names "${ingredient.entry.name}", which is not in the database.`);
  }

  return id;
}

/**
 * The columns that say *which* ingredient a layer is. Exactly one of
 * `ingredientId` and `name` is set — MB.40's `num_nonnulls(ingredient_id,
 * name) = 1` — and `form` rides with `name`.
 */
function layerIdentity(
  ingredient: SeedLayerIngredient,
  ingredientIds: Map<string, string>,
):
  | { ingredientId: string; name: null; form: null }
  | { ingredientId: null; name: string; form: string } {
  return ingredient.tier === 'custom'
    ? { ingredientId: null, name: ingredient.name, form: ingredient.form }
    : { ingredientId: ingredientIdFor(ingredient, ingredientIds), name: null, form: null };
}

/**
 * **A jar's stack is seeded whole or not at all** — the unit keyed on is the
 * spell, not the layer, unlike every other seed here.
 *
 * A layer's identity is a depth in a shared sequence, so "insert what is
 * missing" is not well defined per row: patch one back into a stack a member
 * has edited and both indexes collide — the depth the seed wants is occupied by
 * a different ingredient, and the ingredient it wants is already at another
 * depth. Either collision fails the whole seed. So a jar that already has
 * layers is left as it is, which trades a demo jar that heals itself for a
 * reseed over an edited grimoire being a no-op rather than an error
 * (claude-docs/db.md, "A jar's stack is seeded whole or not at all").
 */
async function insertMissingLayers(
  tx: SeedTransaction,
  ingredientIds: Map<string, string>,
): Promise<void> {
  const stocked = new Set(
    (await tx.select({ spellId: spellIngredients.spellId }).from(spellIngredients)).map(
      (row) => row.spellId,
    ),
  );
  const missing = DEMO_SPELLS.filter((spell) => !stocked.has(spell.id));

  if (missing.length === 0) return;

  // `spell_ingredients` is hard-deleted (MB.34), so these carry the four-column
  // stamp set and `applyAudit` simply stamps fewer columns.
  await tx.insert(spellIngredients).values(
    missing.flatMap((spell) =>
      spell.layers.map((layer, index) =>
        applyAudit(
          'insert',
          {
            spellId: spell.id,
            ...layerIdentity(layer.ingredient, ingredientIds),
            quantity: layer.quantity,
            unit: layer.unit,
            // The position in the array, so the stack is written down once —
            // one per jar from 1, which M10.16's reorder rewrites and M10.9's
            // read orders by.
            layerOrder: index + 1,
            note: layer.note,
          },
          BOOTSTRAP_SESSION,
        ),
      ),
    ),
  );
}

async function insertMissingSpellCategories(
  tx: SeedTransaction,
  categoryIds: Map<string, string>,
): Promise<void> {
  const wanted = DEMO_SPELLS.flatMap((spell) =>
    spell.categories.map((name) => {
      const categoryId = categoryIds.get(name);

      // Unreachable while these spells and §6's vocabulary agree, which the
      // tests pin — but a spell naming a category an admin has since renamed
      // or deleted would otherwise be inserted with `undefined` and fail on
      // NOT NULL several rows later, naming the wrong row.
      if (categoryId === undefined) {
        throw new Error(`"${spell.title}" names category "${name}", which is not in the database.`);
      }

      return { spellId: spell.id, categoryId };
    }),
  );

  const present = new Set(
    (
      await tx
        .select({ spellId: spellCategories.spellId, categoryId: spellCategories.categoryId })
        .from(spellCategories)
    ).map((row) => `${row.spellId}|${row.categoryId}`),
  );
  const missing = wanted.filter(
    (assignment) => !present.has(`${assignment.spellId}|${assignment.categoryId}`),
  );

  if (missing.length === 0) return;

  await tx
    .insert(spellCategories)
    .values(missing.map((assignment) => applyAudit('insert', assignment, BOOTSTRAP_SESSION)));
}
