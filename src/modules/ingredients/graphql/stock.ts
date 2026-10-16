import { builder } from '../../../graphql/builder';
import { sessionOf } from '../../../graphql/context-helpers';
import type { Built } from '../../../graphql/loaders/types';
import { AuditInfo } from '../../../graphql/schema/audit';
import { NotFound } from '../../../lib/errors';
import type { ingredientsById } from '../loaders/ingredients-by-id';
import { clearStock } from '../loaders/stock';
import { UNITS, UNIT_DIMENSIONS } from '../schema/units';
import { createStock, deleteStock, updateStock } from '../services/stock';
import type { StockRow } from '../types';
import { IngredientRef, IngredientVariantRef } from './ingredient';

// Story 14's jars over the wire (M9.4): what a coven holds of each form, the
// three writes that change it, and `Ingredient.stock`, which reads it a page
// at a time. The resolvers refuse only a missing session; who may read or
// write which coven's jars is the stock service's check
// (claude-docs/graphql/schema.md, "Stock: InventoryItem, Ingredient.stock and
// the three stock writes").

const InventoryUnitEnum = builder.enumType('InventoryUnit', { values: UNITS });

const UnitDimensionEnum = builder.enumType('UnitDimension', {
  description: 'What a unit measures; conversion stays inside one.',
  values: UNIT_DIMENSIONS,
});

/** `numeric` text as Postgres returns it, as a number; null stays null. */
const amount = (value: string | null) => (value === null ? null : Number(value));

export const InventoryItemRef = builder.objectRef<StockRow>('InventoryItem').implement({
  description: "A coven's jar of one form of an ingredient.",
  fields: (t) => ({
    id: t.exposeID('id'),
    ingredient: t.field({
      type: IngredientRef,
      resolve: async (row, _args, { loaders }) => ingredientOf(row, loaders),
    }),
    // Read beneath its ingredient, never by a bare id, as `Substitute.variant` reads one.
    variant: t.field({
      type: IngredientVariantRef,
      resolve: async (row, _args, { loaders }) => {
        const variants = await loaders.variantsByIngredient.load(await ingredientOf(row, loaders));
        const variant = variants.find((form) => form.id === row.variantId);
        if (!variant) throw new NotFound('No such form');
        return variant;
      },
    }),
    quantityOnHand: t.float({
      nullable: true,
      description: 'Null is "held, unweighed"; 0 is out of stock.',
      resolve: (row) => amount(row.quantityOnHand),
    }),
    unit: t.expose('unit', { type: InventoryUnitEnum, nullable: true }),
    unitDimension: t.expose('unitDimension', {
      type: UnitDimensionEnum,
      nullable: true,
      description: "The unit's, derived on write and never input.",
    }),
    lowStockThreshold: t.float({
      nullable: true,
      resolve: (row) => amount(row.lowStockThreshold),
    }),
    source: t.exposeString('source', { nullable: true }),
    acquiredDate: t.expose('acquiredDate', { type: 'LocalDate', nullable: true }),
    audit: t.field({ type: AuditInfo, resolve: (row) => row }),
  }),
});

/**
 * The jar's ingredient, read in the jar's coven. The stock read already
 * proved it live and readable, so a null here is a row deleted since.
 */
async function ingredientOf(
  row: StockRow,
  loaders: Built<{ ingredientsById: typeof ingredientsById }>,
) {
  const ingredient = await loaders.ingredientsById.load({
    id: row.ingredientId,
    workspaceId: row.workspaceId,
  });
  if (!ingredient) throw new NotFound('No such ingredient');
  return ingredient;
}

/**
 * M4.5's `StockInput` on the wire. A field left out keeps its value on an
 * update and null clears it; `variantId` is the add's argument, not a field.
 */
const StockInput = builder.inputType('StockInput', {
  fields: (t) => ({
    quantityOnHand: t.float(),
    unit: t.field({ type: InventoryUnitEnum }),
    lowStockThreshold: t.float({
      description: "A missing threshold takes the unit dimension's default on add.",
    }),
    source: t.string(),
    acquiredDate: t.field({ type: 'LocalDate' }),
  }),
});

builder.objectField(IngredientRef, 'stock', (t) =>
  t.field({
    type: [InventoryItemRef],
    description:
      "The coven's jars of this entry, one per form it holds; empty for an entry it holds unstocked.",
    args: { workspaceId: t.arg.id({ required: true }) },
    resolve: (row, { workspaceId }, { loaders }) =>
      loaders.stockByIngredient.load({ ingredientId: row.id, workspaceId }),
  }),
);

builder.mutationField('addIngredientToWorkspace', (t) =>
  t.field({
    type: InventoryItemRef,
    description:
      "Starts the coven's jar of one form; a form it already holds is refused beside variantId.",
    args: {
      workspaceId: t.arg.id({ required: true }),
      variantId: t.arg.id({ required: true }),
      input: t.arg({ type: StockInput, required: true }),
    },
    authScopes: { signedIn: true },
    resolve: async (_root, { workspaceId, variantId, input }, { loaders, ...context }) => {
      const row = await createStock(sessionOf(context), workspaceId, variantId, input);
      clearStock(loaders, row);
      return row;
    },
  }),
);

builder.mutationField('updateStock', (t) =>
  t.field({
    type: InventoryItemRef,
    description: 'Changes a jar: a field left out keeps its value, and null clears it.',
    args: {
      workspaceId: t.arg.id({ required: true }),
      id: t.arg.id({ required: true }),
      input: t.arg({ type: StockInput, required: true }),
    },
    authScopes: { signedIn: true },
    resolve: async (_root, { workspaceId, id, input }, { loaders, ...context }) => {
      const row = await updateStock(sessionOf(context), workspaceId, id, input);
      clearStock(loaders, row);
      return row;
    },
  }),
);

// Answers the deleted id, as every delete does. The service answers no row,
// so the request's cached jars are dropped whole rather than by key.
builder.mutationField('deleteStock', (t) =>
  t.id({
    description: 'A soft delete of the jar; the entry stays.',
    args: {
      workspaceId: t.arg.id({ required: true }),
      id: t.arg.id({ required: true }),
    },
    authScopes: { signedIn: true },
    resolve: async (_root, { workspaceId, id }, { loaders, ...context }) => {
      await deleteStock(sessionOf(context), workspaceId, id);
      loaders.stockByIngredient.clearAll();
      return id;
    },
  }),
);
