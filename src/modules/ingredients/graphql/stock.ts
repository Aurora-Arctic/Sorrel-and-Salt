import { builder } from '../../../graphql/builder';
import { sessionOf } from '../../../graphql/context-helpers';
import type { Built } from '../../../graphql/loaders/types';
import { AuditInfo } from '../../../graphql/schema/audit';
import { NotFound } from '../../../lib/errors';
import type { ingredientsById } from '../loaders/ingredients-by-id';
import { clearStock } from '../loaders/stock';
import { UNITS, UNIT_DIMENSIONS } from '../schema/units';
import { createStock, deleteStock, saveStock, updateStock } from '../services/stock';
import type { StockRow } from '../types';
import { IngredientRef, IngredientVariantRef } from './ingredient';

// The jars over the wire: what a coven holds of each form, the three single-jar writes, `saveStock` for an ingredient's jars together,
// and `Ingredient.stock`, paged. The resolvers refuse only a missing session; the stock service checks the coven
// (claude-docs/graphql/schema.md, "Stock: InventoryItem, Ingredient.stock and the three stock writes").

export const InventoryUnitEnum = builder.enumType('InventoryUnit', { values: UNITS });

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
 * The `StockInput` on the wire. A field left out keeps its value on an
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

const CreateJarInput = builder.inputType('CreateJarInput', {
  description: 'A jar to start, on a form the coven does not hold.',
  fields: (t) => ({
    variantId: t.id({ required: true }),
    input: t.field({ type: StockInput, required: true }),
  }),
});

const UpdateJarInput = builder.inputType('UpdateJarInput', {
  description: 'A change to a jar the coven holds; a field left out keeps its value.',
  fields: (t) => ({
    id: t.id({ required: true }),
    input: t.field({ type: StockInput, required: true }),
  }),
});

// Three lists, not one list of rows with a kind, so a delete cannot carry a
// quantity and `StockInput`'s omit-keeps, null-clears reading holds in both.
const SaveStockInput = builder.inputType('SaveStockInput', {
  description: "One ingredient's stock edited together: jars to start, change and delete.",
  fields: (t) => ({
    create: t.field({ type: [CreateJarInput], required: true }),
    update: t.field({ type: [UpdateJarInput], required: true }),
    delete: t.idList({ required: true }),
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

builder.mutationField('saveStock', (t) =>
  t.field({
    type: [InventoryItemRef],
    description:
      "Creates, changes and deletes one ingredient's jars in one transaction, and answers the entry's live jars. Every jar and form must be the ingredient's, or the whole save is refused; a bad row's issues are pathed `create.<i>.input.<field>` or `update.<i>.input.<field>`.",
    args: {
      workspaceId: t.arg.id({ required: true }),
      ingredientId: t.arg.id({ required: true }),
      input: t.arg({ type: SaveStockInput, required: true }),
    },
    authScopes: { signedIn: true },
    resolve: async (_root, { workspaceId, ingredientId, input }, { loaders, ...context }) => {
      const rows = await saveStock(sessionOf(context), workspaceId, ingredientId, input);
      // The service answers the rows by ingredient, so one key covers the batch.
      clearStock(loaders, { ingredientId, workspaceId });
      return rows;
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
