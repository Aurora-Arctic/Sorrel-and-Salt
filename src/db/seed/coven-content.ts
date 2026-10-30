import { and, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import { ingredientVariants } from '../../modules/ingredients/schema/ingredient-variants';
import { inventoryItems } from '../../modules/ingredients/schema/inventory-items';
import { workspaceCompendiumEntries } from '../../modules/ingredients/schema/workspace-compendium-entries';
import { spells } from '../../modules/grimoire/schema/spells';
import { spellCategories } from '../../modules/grimoire/schema/spell-categories';
import { spellSteps } from '../../modules/grimoire/schema/spell-steps';
import { spellWorkingDeductions } from '../../modules/grimoire/schema/spell-working-deductions';
import { spellWorkingParticipants } from '../../modules/grimoire/schema/spell-working-participants';
import { spellWorkings } from '../../modules/grimoire/schema/spell-workings';
import { dimensionOf } from '../../modules/ingredients/schema/units';
import { defaultThreshold } from '../../modules/ingredients/validation/default-threshold';
import { ingredientSlug } from '../../lib/slugify';
import { insertMissing, insertMissingBy, insertStamped, requireFrom } from './idempotent';
import type {
  CovenTarget,
  NamedIngredient,
  SeedCupboardEntry,
  SeedLayerIngredient,
  SeedSpell,
  SeedStock,
  SeedTransaction,
  SeedVariant,
  SeedWorking,
  SeedWorkspaceIngredient,
} from './types';

// A coven's content, written for any coven: every helper takes the coven it fills, and none assumes that the author is a
// member of it. Idempotent the way `standard` is: inserts what is missing by identity, ignoring `deleted_at` so a
// soft-deleted row is not restored, updating nothing already present
// (claude-docs/db/demo-scenario.md, "The content helpers").

/**
 * An entry's identity as the seed keys it: the formal name, or the label without one, lower-cased (what
 * `identity_key` holds). Keyed on that, a relabelled entry is still the one the seed wrote. A literal is folded
 * here, where JavaScript's lower-casing agrees with Postgres's on ASCII; build the map from one tier's rows.
 */
export function identityOf(entry: { name: string; canonicalName?: string | null }): string {
  return (entry.canonicalName ?? entry.name).toLowerCase();
}

/** The one live row a curated vocabulary names, by name without case. */
export function pickOf(ids: Map<string, string>, name: string, what: string): string {
  return requireFrom(
    ids,
    name.toLowerCase(),
    () => `The seed picks the ${what} "${name}", which no one live row is called.`,
  );
}

/**
 * A coven's cupboard rows, keyed by coven and entry and ignoring `deleted_at`, so a removed row is not put back.
 * Any coven may be passed.
 */
export async function insertMissingCupboardEntries(
  tx: SeedTransaction,
  { workspaceId }: CovenTarget,
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
      workspaceId,
      ingredientId: requireFrom(
        ids,
        identityOf(entry),
        () => `The cupboard holds "${entry.name}", which is not in the compendium.`,
      ),
      ...overrides,
    })),
    { columns: ['workspaceId', 'ingredientId'], toRow: (row) => row },
  );
}

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
 * Every live id a jar or layer of this coven could name, keyed by its tier and `identityOf`,
 * so it finds the row of the tier it names.
 */
export async function ingredientIdByIdentity(
  tx: SeedTransaction,
  { workspaceId }: CovenTarget,
): Promise<Map<string, string>> {
  const rows = await tx
    .select({
      id: ingredients.id,
      identityKey: ingredients.identityKey,
      workspaceId: ingredients.workspaceId,
    })
    .from(ingredients)
    .where(
      and(
        or(isNull(ingredients.workspaceId), eq(ingredients.workspaceId, workspaceId)),
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
 * A coven's jars, keyed on the coven and form pair the live-unique index guards, ignoring `deleted_at`, so a
 * discarded jar is not put back and an edited one not overwritten. A jar the coven added itself for the same form
 * is met, not collided with. The threshold is the dimension's default unless the jar sets one.
 */
export async function insertMissingStock(
  tx: SeedTransaction,
  { workspaceId }: CovenTarget,
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
      workspaceId,
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
    where: eq(inventoryItems.workspaceId, workspaceId),
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
 * Each entry's forms as variants. `formIds` picks a form by name from the curated rows, as an admin's form is;
 * without it the form is typed, as a coven's may be. Keyed as the unique index keys it: a variant an admin
 * removed counts as present and is not restored.
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

// nothing already present.

/**
 * A coven's entries, keyed by identity over its rows, deleted or not, as the
 * compendium's are.
 */
export async function insertMissingWorkspaceIngredients(
  tx: SeedTransaction,
  { workspaceId }: CovenTarget,
  entries: readonly SeedWorkspaceIngredient[],
): Promise<void> {
  await insertMissing(tx, ingredients, entries, {
    existing: async (tx) =>
      (
        await tx
          .select({ identityKey: ingredients.identityKey })
          .from(ingredients)
          .where(eq(ingredients.workspaceId, workspaceId))
      ).map((row) => row.identityKey),
    keyOf: identityOf,
    toRow: ({ variants: _variants, ...entry }) => ({
      ...entry,
      workspaceId,
      slug: ingredientSlug(entry.name, entry.canonicalName),
    }),
  });
}

/**
 * The ids of a coven's live entries among `entries`, by identity: its own, and
 * no member's, a deleted one left out, so nothing is written beside it.
 */
export async function workspaceIngredientIds(
  tx: SeedTransaction,
  { workspaceId }: CovenTarget,
  entries: readonly SeedWorkspaceIngredient[],
): Promise<Map<string, string>> {
  const seeded = new Set(entries.map(identityOf));
  const rows = await tx
    .select({ id: ingredients.id, identityKey: ingredients.identityKey })
    .from(ingredients)
    .where(and(eq(ingredients.workspaceId, workspaceId), isNull(ingredients.deletedAt)));
  return new Map(
    rows.filter((row) => seeded.has(row.identityKey)).map((row) => [row.identityKey, row.id]),
  );
}

/**
 * A coven's spells. One marked `byAuthor` is stamped by `authorId`, so a private one is that author's to read; the rest are
 * the bootstrap user's, as every other seeded row is. `authorId` need not be a member.
 */
export async function insertMissingSpells(
  tx: SeedTransaction,
  { workspaceId, authorId }: CovenTarget,
  wanted: readonly SeedSpell[],
): Promise<void> {
  for (const own of [true, false]) {
    await insertMissingBy(
      tx,
      spells,
      wanted.filter((spell) => (spell.byAuthor === true) === own),
      {
        columns: ['id'],
        toRow: ({ categories: _categories, steps: _steps, ...spell }) => ({
          ...spell,
          workspaceId,
        }),
        session: own ? { userId: authorId } : undefined,
      },
    );
  }
}

/**
 * Each ingredient's first live variant in form order, what a linked
 * layer lays: every entry a jar names has exactly one, written by
 * `insertMissingVariants`; Rosemary's two are laid by no jar.
 */
export async function variantIdByIngredient(tx: SeedTransaction): Promise<Map<string, string>> {
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

/** An instruction-only step: no identity, and so no amount. */
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
 * first and `form` with the second.
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
    () => `A layer names "${ingredient.entry.name}", which has no variant to lay.`,
  );
  return { ingredientId, variantId, name: null, form: null };
}

/**
 * A jar's recipe is seeded whole or not at all: a step's identity is a place in a shared sequence, so patching one into an
 * edited recipe collides on either index (claude-docs/db/demo-scenario.md, "A jar's stack is seeded whole or not at all").
 */
export async function insertMissingSteps(
  tx: SeedTransaction,
  spellsToWrite: readonly SeedSpell[],
  ingredientIds: Map<string, string>,
  variantIds: Map<string, string>,
): Promise<void> {
  const wanted = spellsToWrite.flatMap((spell) =>
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
          }
        : NO_LAYER),
      // The place in the array, one per jar from 1.
      position: index + 1,
    }),
  });
}

export async function insertMissingSpellCategories(
  tx: SeedTransaction,
  spellsToWrite: readonly SeedSpell[],
  categoryIds: Map<string, string>,
): Promise<void> {
  const wanted = spellsToWrite.flatMap((spell) =>
    spell.categories.map((name) => ({
      spellId: spell.id,
      categoryId: requireFrom(
        categoryIds,
        name,
        () =>
          `"${spell.title ?? `Untitled spell ${spell.id}`}" names category "${name}", which is not in the database.`,
      ),
    })),
  );

  await insertMissingBy(tx, spellCategories, wanted, {
    columns: ['spellId', 'categoryId'],
    toRow: (assignment) => assignment,
  });
}

/**
 * Writes the workings missing by id, with their participants and deductions, and takes each new complete working's
 * deductions from its jars. A working already present is left as it is and its jars are not decremented again, so a
 * re-run changes nothing. Each row is stamped by the member who recorded the working.
 */
export async function insertMissingWorkings(
  tx: SeedTransaction,
  workings: readonly SeedWorking[],
): Promise<void> {
  const present = new Set(
    (await tx.select({ id: spellWorkings.id }).from(spellWorkings)).map((row) => row.id),
  );

  for (const entry of workings) {
    if (present.has(entry.id)) continue;
    const session = { userId: entry.recorder };

    await insertStamped(
      tx,
      spellWorkings,
      [
        {
          id: entry.id,
          spellId: entry.spellId,
          status: entry.status,
          workedOn: entry.workedOn,
          // A moment on the day itself, as completing it would have set.
          completedAt: entry.status === 'complete' ? new Date(`${entry.workedOn}T20:00:00Z`) : null,
          note: entry.note,
          visibility: entry.visibility,
        },
      ],
      session,
    );

    await insertStamped(
      tx,
      spellWorkingParticipants,
      entry.participants.map((participant, position) => ({
        workingId: entry.id,
        userId: 'userId' in participant ? participant.userId : null,
        name: 'name' in participant ? participant.name : null,
        position,
      })),
      session,
    );

    for (const deduction of entry.deductions) {
      const [step] = await tx
        .select({ id: spellSteps.id })
        .from(spellSteps)
        .where(
          and(
            eq(spellSteps.spellId, entry.spellId),
            eq(spellSteps.position, deduction.stepPosition),
            isNull(spellSteps.deletedAt),
          ),
        );
      if (!step) {
        throw new Error(
          `Working ${entry.id} takes from step ${deduction.stepPosition} of spell ${entry.spellId}, which has none.`,
        );
      }
      await insertStamped(
        tx,
        spellWorkingDeductions,
        [
          {
            workingId: entry.id,
            spellStepId: step.id,
            inventoryItemId: deduction.jarId,
            quantity: deduction.quantity,
            unit: deduction.unit,
            shortfall: deduction.shortfall,
          },
        ],
        session,
      );
      // What the service's `decrementStock` does: the amount taken, from what the jar holds.
      await tx
        .update(inventoryItems)
        .set({
          quantityOnHand: sql`${inventoryItems.quantityOnHand} - ${deduction.quantity}::numeric`,
        })
        .where(eq(inventoryItems.id, deduction.jarId));
    }
  }
}
