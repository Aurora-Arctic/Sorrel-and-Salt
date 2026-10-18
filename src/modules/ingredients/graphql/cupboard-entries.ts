import { builder } from '../../../graphql/builder';
import { sessionOf } from '../../../graphql/context-helpers';
import type { Built } from '../../../graphql/loaders/types';
import { NotFound } from '../../../lib/errors';
import type { ingredientsById } from '../loaders/ingredients-by-id';
import { type cupboardEntryByIngredient, clearCupboardEntry } from '../loaders/cupboard-entries';
import {
  addCupboardEntry,
  findCompendiumMatches,
  annotateCupboardEntry,
  convertLocalToCompendiumEntry,
  removeCupboardEntry,
} from '../services/cupboard-entries';
import type { CupboardEntryNode, CupboardEntryRow, DroppedOnConvert } from '../types';
import { isAnnotated } from '../validation/cupboard-merge';
import { IngredientElementEnum, IngredientRef } from './ingredient';

// A coven's cupboard entry over the wire (M12.14): the coven's own say over
// one compendium entry, read beside the entry rather than merged into it, so
// a client can show both. Who may read it is the cupboard-entry service's
// check, through the loader (claude-docs/graphql/schema.md, "Cupboard
// entries: CupboardEntry and Ingredient.cupboardEntry").

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
      resolve: (entry) => isAnnotated(entry),
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

builder.objectField(IngredientRef, 'inCupboard', (t) =>
  t.boolean({
    description:
      "Whether the coven's cupboard names this compendium entry: false for one it does not hold and for a coven's own ingredient, and with no coven named.",
    args: { workspaceId: t.arg.id({ required: false }) },
    resolve: async (row, { workspaceId }, { loaders }) =>
      workspaceId != null &&
      (await loaders.cupboardEntryByIngredient.load({ ingredientId: row.id, workspaceId })) != null,
  }),
);

// The Add flow's question (M12.20): the exact matches, a page at a time.
builder.queryField('compendiumMatches', (t) =>
  t.pagedConnection({
    type: IngredientRef,
    description:
      'The compendium entries whose name or formal name is exactly the typed one, case aside: what the Add Ingredient form asks about before it makes a second copy.',
    args: { workspaceId: t.arg.id({ required: true }), name: t.arg.string({ required: true }) },
    resolve: (_query, { workspaceId, name }, page, context) =>
      findCompendiumMatches(sessionOf(context), workspaceId, name, page),
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

const DroppedOnConvertRef = builder.objectRef<DroppedOnConvert>('DroppedOnConvert').implement({
  description:
    'What an own entry had that the compendium entry it became does not carry, by name, each list sorted. The rows stay on the deleted own entry.',
  fields: (t) => ({
    forms: t.exposeStringList('forms', {
      description: 'Forms that matched no compendium form and held no jar or spell layer.',
    }),
    folkNames: t.exposeStringList('folkNames'),
    substitutes: t.exposeStringList('substitutes', {
      description: "The entry's and its forms'.",
    }),
    categories: t.exposeStringList('categories', {
      description: "The entry's and its forms'.",
    }),
    references: t.exposeStringList('references', {
      description: "The entry's and its forms', each as its bibliography entry reads.",
    }),
    deities: t.exposeStringList('deities'),
  }),
});

const ConvertedLocalRef = builder
  .objectRef<{ entry: CupboardEntryNode; dropped: DroppedOnConvert }>('ConvertedLocal')
  .implement({
    description:
      'An own entry turned into a compendium entry: the cupboard entry written, and what was lost.',
    fields: (t) => ({
      entry: t.field({ type: CupboardEntryRef, resolve: (converted) => converted.entry }),
      dropped: t.field({ type: DroppedOnConvertRef, resolve: (converted) => converted.dropped }),
    }),
  });

builder.mutationField('convertLocalToCompendiumEntry', (t) =>
  t.field({
    type: ConvertedLocalRef,
    description:
      "Turns one of the coven's own entries into the compendium entry it duplicates: its jars and spell layers move to the compendium's forms of the same name, a cupboard entry carries what the coven said differently, and the own entry is deleted. Refused, with nothing moved, when a form holding a jar or a layer has no match, or a jar or a layer would meet one of the compendium's.",
    args: {
      workspaceId: t.arg.id({ required: true }),
      localId: t.arg.id({ required: true }),
      compendiumId: t.arg.id({ required: true }),
    },
    authScopes: { signedIn: true },
    resolve: async (_root, { workspaceId, localId, compendiumId }, { loaders, ...context }) => {
      const { entry, dropped } = await convertLocalToCompendiumEntry(
        sessionOf(context),
        workspaceId,
        localId,
        compendiumId,
      );
      return { entry: await nodeOf(entry, loaders), dropped };
    },
  }),
);
