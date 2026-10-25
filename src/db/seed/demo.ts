import { and, eq, isNull } from 'drizzle-orm';
import { beginSeedTransaction, insertMissing, insertMissingBy, requireFrom } from './idempotent';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import { ingredientVariants } from '../../modules/ingredients/schema/ingredient-variants';
import { spells } from '../../modules/grimoire/schema/spells';
import { spellCategories } from '../../modules/grimoire/schema/spell-categories';
import { spellSteps } from '../../modules/grimoire/schema/spell-steps';
import { categoryIdByName } from './categories';
import { assertCompendiumValid, seedCompendiumContent } from './compendium';
import { loadCompendium } from './compendium/load';
import { ingredientSlug } from '../../lib/slugify';
import {
  COMPENDIUM_INGREDIENTS,
  STANDARD_CUPBOARD,
  STANDARD_STOCK,
  WORKSPACE_W_ID,
  identityOf,
  ingredientIdByIdentity,
  insertMissingCupboardEntries,
  insertMissingStock,
  insertMissingVariants,
  namedIngredientId,
  reslugIngredients,
  seedStandardContent,
} from './standard';
import type { NamedIngredient, SeedCupboardEntry, SeedStock } from './standard';
import type {
  SeedDatabase,
  SeedLayerIngredient,
  SeedSpell,
  SeedTransaction,
  SeedWorkspaceIngredient,
} from './types';

// The `demo` scenario: `standard` plus spells with ingredients and layer order,
// written as a member would write them since screenshots are taken against it.
// It adds W's cupboard (seven compendium entries held, six of them annotated),
// W's own ingredients, so the jars mix both kinds, one custom one-off layer
// with no `ingredient_id`, and W's stock: seven jars of what it holds
// (claude-docs/db/demo-scenario.md, "The demo scenario").
// Writes go through the handle `seed()` was given — see minimal.ts.

/** Story 29's one-field stub: a thing no naming system names, so `none`. */
const HEARTH_ASH: SeedWorkspaceIngredient = {
  name: 'Hearth Ash',
  nomenclature: 'none',
  variants: [{ form: 'ash' }],
  description: 'Swept cold from the grate after a Yule fire and kept in a tin.',
  elements: ['fire'],
};

/**
 * The "Similar in the Compendium" case (M12.22): bought as "cat's claw" with no
 * formal name, so it is an own stub beside the compendium's five Cat's Claws
 * (four plants and the animal claw). A member can declare it to be one of the
 * five (M12.21). It is the one own entry here that shares a name with the
 * compendium, and it hides none of the five: a name match hides nothing
 * (M12.28).
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
 * W's cupboard in `demo`: the `standard` rows, and the curated German Chamomile
 * (which only `demo` seeds) relabelled, with a colour the compendium does not list.
 */
export const WORKSPACE_W_CUPBOARD: SeedCupboardEntry[] = [
  ...STANDARD_CUPBOARD,
  // The compendium's German Chamomile, relabelled, with a colour it does not list.
  {
    entry: { name: 'German Chamomile', canonicalName: 'Matricaria chamomilla' },
    label: 'House Chamomile',
    colors: ['white', 'yellow'],
  },
];

/** Everything W has of its own. Seeded into W, and invisible from X. */
export const WORKSPACE_W_INGREDIENTS: SeedWorkspaceIngredient[] = [HEARTH_ASH, CATS_CLAW];

/**
 * The curated compendium, read from the files under `compendium/` once, at
 * module load, because the spells below look their entries up then.
 */
const CURATED_FILES = loadCompendium();

/**
 * A compendium entry, `standard` or an `approved` file, looked up at module
 * load so a layer naming a missing entry fails on import rather than at a
 * foreign key later. A file held back from `approved` is not seeded, so a
 * layer may not name it.
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
 * W's stock in `demo`: the `standard` jars, and the jars on entries only
 * `demo` seeds, in the ids `…0001`, `…0002`, `…0005` and `…0006` that
 * `standard` leaves free. Every compendium entry named here is in
 * `WORKSPACE_W_CUPBOARD`.
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

/** The jars, fixed ids in a block of their own (`…0002-…`). */
export const DEMO_SPELLS: SeedSpell[] = [
  {
    id: '00000000-0000-0000-0002-000000000001',
    title: 'Hearth Warding Jar',
    intent: 'Keep the house and everyone asleep in it from what walks the lane at night.',
    jarSize: '4 oz jar',
    sealWaxColor: 'Black',
    moonPhase: 'Waning crescent',
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
      { body: 'Tamp the salts down before the next layer goes in.' },
      {
        ingredient: fromWorkspace(HEARTH_ASH),
        quantity: '1.000',
        unit: 'pinch',
        note: 'From our own grate, which is the whole point of the jar.',
      },
      {
        // The custom, one-off layer: never an `ingredients` row, and `dust` is
        // uncurated — as a member would write it.
        ingredient: { tier: 'custom', name: 'Dust from the front step', form: 'dust' },
        quantity: '1.000',
        unit: 'pinch',
        note: 'Swept from our own doorstep at dusk. Not something to go on a shelf.',
      },
      {
        ingredient: fromCompendium('Rosemary', 'Salvia rosmarinus'),
        quantity: null,
        unit: null,
        note: 'A sprig laid on top, whole, before the wax goes on.',
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
    jarSize: 'A palm-sized muslin bag',
    sealWaxColor: null,
    moonPhase: 'Full',
    dayOfWeek: 'Monday',
    note: 'Empty and refill it when it stops smelling of anything.',
    status: 'draft',
    categories: ['Dream Work', 'Sleep', 'Divination'],
    steps: [
      {
        body: 'Crush the mugwort between your hands before it goes in.',
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
        ingredient: fromCompendium('German Chamomile', 'Matricaria chamomilla'),
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
      { body: 'Stitch the bag closed and keep it inside the pillowcase.' },
    ],
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

    await insertMissingWorkspaceIngredients(tx);
    const own = await workspaceIngredientIds(tx);
    // W's entries' slugs and forms; the compendium's `standard` wrote already.
    await reslugIngredients(tx, [...own.values()]);
    await insertMissingVariants(
      tx,
      WORKSPACE_W_INGREDIENTS.flatMap((entry) => {
        const ingredientId = own.get(identityOf(entry));
        return ingredientId ? [{ ingredientId, variants: entry.variants }] : [];
      }),
    );
    await insertMissingCupboardEntries(tx, WORKSPACE_W_CUPBOARD);
    await insertMissingSpells(tx);

    const ingredientIds = await ingredientIdByIdentity(tx);
    await insertMissingSteps(tx, ingredientIds, await variantIdByIngredient(tx));
    await insertMissingSpellCategories(tx, await categoryIdByName(tx));
    await insertMissingStock(tx, DEMO_STOCK, ingredientIds);
  });
}

// Idempotent the way `standard` is: inserts what is missing by identity,
// ignoring `deleted_at` so a soft-deleted spell is not restored, updating
// nothing already present.

/**
 * W's entries, keyed by identity over W's rows, deleted or not, as the
 * compendium's are.
 */
async function insertMissingWorkspaceIngredients(tx: SeedTransaction): Promise<void> {
  await insertMissing(tx, ingredients, WORKSPACE_W_INGREDIENTS, {
    existing: async (tx) =>
      (
        await tx
          .select({ identityKey: ingredients.identityKey })
          .from(ingredients)
          .where(eq(ingredients.workspaceId, WORKSPACE_W_ID))
      ).map((row) => row.identityKey),
    keyOf: identityOf,
    toRow: ({ variants: _variants, ...entry }) => ({
      ...entry,
      workspaceId: WORKSPACE_W_ID,
      slug: ingredientSlug(entry.name, entry.canonicalName),
    }),
  });
}

/**
 * The ids of W's live entries this scenario seeds, by identity: its own, and
 * no member's, a deleted one left out, so nothing is written beside it.
 */
async function workspaceIngredientIds(tx: SeedTransaction): Promise<Map<string, string>> {
  const seeded = new Set(WORKSPACE_W_INGREDIENTS.map(identityOf));
  const rows = await tx
    .select({ id: ingredients.id, identityKey: ingredients.identityKey })
    .from(ingredients)
    .where(and(eq(ingredients.workspaceId, WORKSPACE_W_ID), isNull(ingredients.deletedAt)));
  return new Map(
    rows.filter((row) => seeded.has(row.identityKey)).map((row) => [row.identityKey, row.id]),
  );
}

async function insertMissingSpells(tx: SeedTransaction): Promise<void> {
  await insertMissingBy(tx, spells, DEMO_SPELLS, {
    columns: ['id'],
    toRow: ({ categories: _categories, steps: _steps, ...spell }) => ({
      ...spell,
      workspaceId: WORKSPACE_W_ID,
    }),
  });
}

/**
 * Each ingredient's first live variant in form order (MB.217), what a linked
 * layer lays: every entry a jar names has exactly one, written by
 * `insertMissingVariants`; Rosemary's two are laid by no jar.
 */
async function variantIdByIngredient(tx: SeedTransaction): Promise<Map<string, string>> {
  const rows = await tx
    .select({
      id: ingredientVariants.id,
      ingredientId: ingredientVariants.ingredientId,
      form: ingredientVariants.form,
    })
    .from(ingredientVariants)
    .where(isNull(ingredientVariants.deletedAt));
  const first = new Map<string, { id: string; form: string }>();
  for (const row of rows) {
    const held = first.get(row.ingredientId);
    if (!held || row.form.toLowerCase() < held.form.toLowerCase()) first.set(row.ingredientId, row);
  }
  return new Map([...first].map(([ingredientId, row]) => [ingredientId, row.id]));
}

/** An instruction-only step: no identity, and so no amount or note. */
const NO_LAYER = {
  ingredientId: null,
  variantId: null,
  name: null,
  form: null,
  quantity: null,
  unit: null,
  note: null,
} as const;

/**
 * For a layer, exactly one of `ingredientId` and `name` is set, `variantId` rides with the
 * first (MB.217) and `form` with the second.
 */
function layerIdentity(
  ingredient: SeedLayerIngredient,
  ingredientIds: Map<string, string>,
  variantIds: Map<string, string>,
):
  | { ingredientId: string; variantId: string; name: null; form: null }
  | { ingredientId: null; variantId: null; name: string; form: string } {
  if (ingredient.tier === 'custom') {
    return { ingredientId: null, variantId: null, name: ingredient.name, form: ingredient.form };
  }
  const ingredientId = namedIngredientId(ingredient, ingredientIds);
  const variantId = requireFrom(
    variantIds,
    ingredientId,
    () => `A demo layer names "${ingredient.entry.name}", which has no variant to lay.`,
  );
  return { ingredientId, variantId, name: null, form: null };
}

/**
 * A jar's recipe is seeded whole or not at all: a step's identity is a place in
 * a shared sequence, so patching one into an edited recipe collides on either
 * index. A jar that already has steps is left as it is
 * (claude-docs/db/demo-scenario.md, "A jar's stack is seeded whole or not at all").
 */
async function insertMissingSteps(
  tx: SeedTransaction,
  ingredientIds: Map<string, string>,
  variantIds: Map<string, string>,
): Promise<void> {
  const wanted = DEMO_SPELLS.flatMap((spell) =>
    spell.steps.map((step, index) => ({ spellId: spell.id, step, index })),
  );

  // Keyed by the jar, not the step, so a stocked jar keeps every step out —
  // a removed step's tombstone included, since the jar has been edited.
  await insertMissingBy(tx, spellSteps, wanted, {
    columns: ['spellId'],
    toRow: ({ spellId, step, index }) => ({
      spellId,
      body: step.body ?? null,
      ...(step.ingredient
        ? {
            ...layerIdentity(step.ingredient, ingredientIds, variantIds),
            quantity: step.quantity,
            unit: step.unit,
            note: step.note,
          }
        : NO_LAYER),
      // The place in the array, one per jar from 1, written to `layer_order`
      // too until M13.9 drops it.
      position: index + 1,
      layerOrder: index + 1,
    }),
  });
}

async function insertMissingSpellCategories(
  tx: SeedTransaction,
  categoryIds: Map<string, string>,
): Promise<void> {
  const wanted = DEMO_SPELLS.flatMap((spell) =>
    spell.categories.map((name) => ({
      spellId: spell.id,
      categoryId: requireFrom(
        categoryIds,
        name,
        () => `"${spell.title}" names category "${name}", which is not in the database.`,
      ),
    })),
  );

  await insertMissingBy(tx, spellCategories, wanted, {
    columns: ['spellId', 'categoryId'],
    toRow: (assignment) => assignment,
  });
}
