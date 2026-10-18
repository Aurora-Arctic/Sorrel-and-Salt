import { and, eq, isNull, or } from 'drizzle-orm';
import { beginSeedTransaction, insertMissing, insertMissingBy, requireFrom } from './idempotent';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import { ingredientVariants } from '../../modules/ingredients/schema/ingredient-variants';
import { workspaceCompendiumEntries } from '../../modules/ingredients/schema/workspace-compendium-entries';
import { spells } from '../../modules/grimoire/schema/spells';
import { spellCategories } from '../../modules/grimoire/schema/spell-categories';
import { spellIngredients } from '../../modules/grimoire/schema/spell-ingredients';
import { categoryIdByName } from './categories';
import { assertCompendiumValid, seedCompendiumContent } from './compendium';
import { COMPENDIUM } from './compendium/index';
import { ingredientSlug } from '../../lib/slugify';
import {
  COMPENDIUM_INGREDIENTS,
  WORKSPACE_W_ID,
  identityOf,
  insertMissingVariants,
  reslugIngredients,
  seedStandardContent,
} from './standard';
import type {
  SeedDatabase,
  SeedLayerIngredient,
  SeedSpell,
  SeedTransaction,
  SeedWorkspaceIngredient,
} from './types';

// The `demo` scenario: `standard` plus spells with ingredients and layer order,
// written as a member would write them since screenshots are taken against it.
// It adds W's cupboard (three compendium entries held, two of them annotated),
// W's own ingredients, so the jars mix both kinds, and one custom one-off layer
// with no `ingredient_id` (claude-docs/db/demo-scenario.md, "The demo scenario").
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
 * compendium; until M12.28 retires the hiding rule it still replaces all five
 * in the lists.
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
 * A compendium entry W's cupboard holds, by the entry's formal name, with the
 * coven's own say over it (M12.13). Each override is null, so the compendium's
 * value shows, unless set here. An entry with none is in the cupboard and not
 * annotated.
 */
export interface SeedCupboardEntry {
  entry: { name: string; canonicalName: string };
  label?: string;
  description?: string;
  colors?: string[];
}

export const WORKSPACE_W_CUPBOARD: SeedCupboardEntry[] = [
  // Rosemary the coven grows, under its own label and its own description.
  {
    entry: { name: 'Rosemary', canonicalName: 'Salvia rosmarinus' },
    label: 'Garden Rosemary',
    description: 'Cut from the bush by the back door, dried in bunches over the stove.',
  },
  // The compendium's German Chamomile, relabelled, with a colour it does not list.
  {
    entry: { name: 'German Chamomile', canonicalName: 'Matricaria chamomilla' },
    label: 'House Chamomile',
    colors: ['white', 'yellow'],
  },
  // In the cupboard and not annotated: the row alone.
  { entry: { name: 'Ginger', canonicalName: 'Zingiber officinale' } },
];

/** Everything W has of its own. Seeded into W, and invisible from X. */
export const WORKSPACE_W_INGREDIENTS: SeedWorkspaceIngredient[] = [HEARTH_ASH, CATS_CLAW];

/**
 * A compendium entry, `standard` or the curated list, looked up at module load
 * so a layer naming a missing entry fails on import rather than at a foreign
 * key later.
 */
function fromCompendium(name: string, canonicalName?: string): SeedLayerIngredient {
  const entry = [...COMPENDIUM_INGREDIENTS, ...COMPENDIUM.flatMap((shard) => shard.entries)].find(
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
    ],
  },
];

export async function seedDemo(db: SeedDatabase): Promise<void> {
  // Before the transaction opens, as seedCompendium does: an invalid literal writes nothing.
  assertCompendiumValid(COMPENDIUM);
  await beginSeedTransaction(db, async (tx) => {
    // Inside the same transaction: every spell points at rows `standard` writes.
    // A deity pick someone deleted stays deleted, as a spell does.
    await seedStandardContent(tx, { restoreDeletedDeityPicks: false });
    // The curated compendium, after standard so its fixture entries keep their
    // rows and a curated entry of the same identity is skipped. Demo is for a
    // person exploring the app; standard stays the test fixture cast
    // (claude-docs/db/demo-scenario.md).
    await seedCompendiumContent(tx, COMPENDIUM);

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
    await insertMissingCupboardEntries(tx);
    await insertMissingSpells(tx);

    const ingredientIds = await ingredientIdByIdentity(tx);
    await insertMissingLayers(tx, ingredientIds, await variantIdByIngredient(tx));
    await insertMissingSpellCategories(tx, await categoryIdByName(tx));
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
 * W's cupboard rows, keyed by the coven and the entry, ignoring `deleted_at` so
 * a row the coven removed is not put back. The seed writes the rows directly,
 * as it writes every other, not through the cupboard service.
 */
async function insertMissingCupboardEntries(tx: SeedTransaction): Promise<void> {
  const compendium = await tx
    .select({ id: ingredients.id, identityKey: ingredients.identityKey })
    .from(ingredients)
    .where(and(isNull(ingredients.workspaceId), isNull(ingredients.deletedAt)));
  const ids = new Map(compendium.map((row) => [row.identityKey, row.id]));

  await insertMissingBy(
    tx,
    workspaceCompendiumEntries,
    WORKSPACE_W_CUPBOARD.map(({ entry, ...overrides }) => ({
      workspaceId: WORKSPACE_W_ID,
      ingredientId: requireFrom(
        ids,
        identityOf(entry),
        () => `The demo cupboard holds "${entry.name}", which is not in the compendium.`,
      ),
      ...overrides,
    })),
    { columns: ['workspaceId', 'ingredientId'], toRow: (row) => row },
  );
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
    toRow: ({ categories: _categories, layers: _layers, ...spell }) => ({
      ...spell,
      workspaceId: WORKSPACE_W_ID,
    }),
  });
}

/**
 * Every live id a layer could name, keyed by its tier and `identityOf`, so a
 * layer finds the row of the tier it names.
 */
async function ingredientIdByIdentity(tx: SeedTransaction): Promise<Map<string, string>> {
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

/** A layer's lookup key: the tier it names, and the identity within it. */
const tierKey = (tier: 'compendium' | 'workspace', identity: string) => `${tier}|${identity}`;

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

/**
 * Unreachable today, but a silent `undefined` would make a null
 * `ingredient_id` — a *custom* row under the CHECK — so the failure would be a
 * blank-named layer rather than an error.
 */
function ingredientIdFor(
  ingredient: SeedLayerIngredient & { tier: 'compendium' | 'workspace' },
  ingredientIds: Map<string, string>,
): string {
  return requireFrom(
    ingredientIds,
    tierKey(ingredient.tier, identityOf(ingredient.entry)),
    () => `A demo layer names "${ingredient.entry.name}", which is not in the database.`,
  );
}

/**
 * Exactly one of `ingredientId` and `name` is set, `variantId` rides with the
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
  const ingredientId = ingredientIdFor(ingredient, ingredientIds);
  const variantId = requireFrom(
    variantIds,
    ingredientId,
    () => `A demo layer names "${ingredient.entry.name}", which has no variant to lay.`,
  );
  return { ingredientId, variantId, name: null, form: null };
}

/**
 * A jar's stack is seeded whole or not at all: a layer's identity is a depth in
 * a shared sequence, so patching one into an edited stack collides on either
 * index. A jar that already has layers is left as it is
 * (claude-docs/db/demo-scenario.md, "A jar's stack is seeded whole or not at all").
 */
async function insertMissingLayers(
  tx: SeedTransaction,
  ingredientIds: Map<string, string>,
  variantIds: Map<string, string>,
): Promise<void> {
  const wanted = DEMO_SPELLS.flatMap((spell) =>
    spell.layers.map((layer, index) => ({ spellId: spell.id, layer, index })),
  );

  // Keyed by the jar, not the layer, so a stocked jar keeps every layer out —
  // a removed layer's tombstone included, since the jar has been edited.
  await insertMissingBy(tx, spellIngredients, wanted, {
    columns: ['spellId'],
    toRow: ({ spellId, layer, index }) => ({
      spellId,
      ...layerIdentity(layer.ingredient, ingredientIds, variantIds),
      quantity: layer.quantity,
      unit: layer.unit,
      // The position in the array, one per jar from 1.
      layerOrder: index + 1,
      note: layer.note,
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
