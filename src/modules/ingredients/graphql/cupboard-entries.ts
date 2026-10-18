import { builder } from '../../../graphql/builder';
import { sessionOf } from '../../../graphql/context-helpers';
import type { Built } from '../../../graphql/loaders/types';
import { NotFound } from '../../../lib/errors';
import type { ingredientsById } from '../loaders/ingredients-by-id';
import { type cupboardEntryByIngredient, clearCupboardEntry } from '../loaders/cupboard-entries';
import {
  addCupboardEntry,
  annotateCupboardEntry,
  removeCupboardEntry,
} from '../services/cupboard-entries';
import type { CupboardEntryNode, CupboardEntryRow } from '../types';
import { IngredientElementEnum, IngredientRef } from './ingredient';

// A coven's cupboard entry over the wire (M12.14): the coven's own say over
// one compendium entry, read beside the entry rather than merged into it, so
// a client can show both. Who may read it is the cupboard-entry service's
// check, through the loader (claude-docs/graphql/schema.md, "Cupboard
// entries: CupboardEntry and Ingredient.cupboardEntry").

/** The seven overrides; any one set makes the entry annotated. */
const OVERRIDES = [
  'label',
  'description',
  'safetyNotes',
  'elements',
  'celestialBodies',
  'zodiacSigns',
  'colors',
] as const satisfies readonly (keyof CupboardEntryRow)[];

export const CupboardEntryRef = builder.objectRef<CupboardEntryNode>('CupboardEntry').implement({
  description:
    "A coven's own say over one compendium entry it holds. A null field is the compendium's value; an empty list is one the coven cleared.",
  fields: (t) => ({
    id: t.exposeID('id'),
    label: t.exposeString('label', {
      nullable: true,
      description: "What the coven calls the entry; null is the compendium's name.",
    }),
    description: t.exposeString('description', { nullable: true }),
    safetyNotes: t.exposeString('safetyNotes', { nullable: true }),
    elements: t.expose('elements', { type: [IngredientElementEnum], nullable: true }),
    celestialBodies: t.exposeStringList('celestialBodies', { nullable: true }),
    zodiacSigns: t.exposeStringList('zodiacSigns', { nullable: true }),
    colors: t.exposeStringList('colors', { nullable: true }),
    annotated: t.boolean({
      description: 'True when the coven has set any of the seven overrides.',
      resolve: (entry) => OVERRIDES.some((column) => entry[column] !== null),
    }),
    compendiumName: t.exposeString('compendiumName', {
      description: "The compendium entry's own name, whatever the coven's label.",
    }),
  }),
});

builder.objectField(IngredientRef, 'cupboardEntry', (t) =>
  t.field({
    type: CupboardEntryRef,
    nullable: true,
    description:
      "The coven's cupboard entry for this compendium entry; null for one it does not hold and for a coven's own ingredient.",
    args: { workspaceId: t.arg.id({ required: true }) },
    resolve: async (row, { workspaceId }, { loaders }) => {
      const entry = await loaders.cupboardEntryByIngredient.load({
        ingredientId: row.id,
        workspaceId,
      });
      return entry && { ...entry, compendiumName: row.name };
    },
  }),
);

// The three writes (M12.15). The resolvers refuse only a missing session; who
// may write which coven's cupboard is the service's check.

const CupboardEntryInputRef = builder.inputType('CupboardEntryInput', {
  description:
    "The coven's overrides of a compendium entry. On an add, a field left out is no override. On an annotate, a field left out keeps its value, null hands it back to the compendium, and a list, even an empty one, is the coven's own.",
  fields: (t) => ({
    label: t.string({ description: 'What the coven calls the entry; unique in the coven.' }),
    description: t.string(),
    safetyNotes: t.string(),
    elements: t.field({ type: [IngredientElementEnum] }),
    celestialBodies: t.stringList(),
    zodiacSigns: t.stringList(),
    colors: t.stringList(),
  }),
});

/** The written row with the compendium entry's own name beside it, as the read answers. */
async function nodeOf(
  row: CupboardEntryRow,
  loaders: Built<{
    cupboardEntryByIngredient: typeof cupboardEntryByIngredient;
    ingredientsById: typeof ingredientsById;
  }>,
): Promise<CupboardEntryNode> {
  const { ingredientId, workspaceId } = row;
  clearCupboardEntry(loaders, { ingredientId, workspaceId });
  const entry = await loaders.ingredientsById.load({ id: ingredientId, workspaceId });
  if (!entry) throw new NotFound('No such compendium entry');
  return { ...row, compendiumName: entry.name };
}

builder.mutationField('addCupboardEntry', (t) =>
  t.field({
    type: CupboardEntryRef,
    description:
      "Adds a compendium entry to the coven's cupboard, with the overrides given. Creates no jar and no form; an entry the coven already holds is refused.",
    args: {
      workspaceId: t.arg.id({ required: true }),
      ingredientId: t.arg.id({ required: true }),
      input: t.arg({ type: CupboardEntryInputRef, required: false }),
    },
    authScopes: { signedIn: true },
    resolve: async (_root, { workspaceId, ingredientId, input }, { loaders, ...context }) =>
      nodeOf(
        await addCupboardEntry(sessionOf(context), workspaceId, ingredientId, input ?? {}),
        loaders,
      ),
  }),
);

builder.mutationField('annotateCupboardEntry', (t) =>
  t.field({
    type: CupboardEntryRef,
    description:
      "Changes the coven's overrides: a field left out keeps its value, null hands it back to the compendium, and a list, even an empty one, is the coven's own.",
    args: {
      workspaceId: t.arg.id({ required: true }),
      ingredientId: t.arg.id({ required: true }),
      input: t.arg({ type: CupboardEntryInputRef, required: true }),
    },
    authScopes: { signedIn: true },
    resolve: async (_root, { workspaceId, ingredientId, input }, { loaders, ...context }) =>
      nodeOf(
        await annotateCupboardEntry(sessionOf(context), workspaceId, ingredientId, input),
        loaders,
      ),
  }),
);

// Answers the compendium entry's id, as every delete answers the id it removed.
builder.mutationField('removeCupboardEntry', (t) =>
  t.id({
    description:
      "Takes the entry out of the coven's cupboard; refused while the coven holds a jar of any of its forms.",
    args: {
      workspaceId: t.arg.id({ required: true }),
      ingredientId: t.arg.id({ required: true }),
    },
    authScopes: { signedIn: true },
    resolve: async (_root, { workspaceId, ingredientId }, { loaders, ...context }) => {
      await removeCupboardEntry(sessionOf(context), workspaceId, ingredientId);
      clearCupboardEntry(loaders, { ingredientId, workspaceId });
      return ingredientId;
    },
  }),
);
