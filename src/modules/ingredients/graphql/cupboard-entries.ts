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
  convertCompendiumEntryToLocal,
  removeCupboardEntry,
} from '../services/cupboard-entries';
import { getIngredient } from '../services/compendium';
import type {
  ConvertedCompendium,
  CupboardEntryNode,
  CupboardEntryRow,
  DroppedOnConvert,
} from '../types';
import { isAnnotated } from '../validation/cupboard-merge';
import { EXPECTED_REVISION, IngredientElementEnum, IngredientRef } from './ingredient';

// A coven's cupboard entry over the wire: the coven's own say over one compendium entry, read beside the entry so a client can show both.
// Who may read it is the service's check, through the loader (claude-docs/graphql/schema.md, "Cupboard entries: CupboardEntry and Ingredient.cupboardEntry").

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
    revision: t.exposeInt('revision', {
      description: 'Raised by one on every save; a save names the revision it was written against.',
    }),
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

// The Add flow's question: the exact matches, a page at a time.
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

// The three writes. The resolvers refuse only a missing session; who
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

/**
 * The written row with the compendium entry's own name beside it. `read` fetches the entry where the loader cannot:
 * the loader reads live entries only, and a coven annotates a retired entry it still holds.
 */
async function nodeOf(
  row: CupboardEntryRow,
  loaders: Built<{
    cupboardEntryByIngredient: typeof cupboardEntryByIngredient;
    ingredientsById: typeof ingredientsById;
  }>,
  read?: () => Promise<{ name: string }>,
): Promise<CupboardEntryNode> {
  const { ingredientId, workspaceId } = row;
  clearCupboardEntry(loaders, { ingredientId, workspaceId });
  const entry = read
    ? await read()
    : await loaders.ingredientsById.load({ id: ingredientId, workspaceId });
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
      expectedRevision: t.arg.int({ required: false, description: EXPECTED_REVISION }),
    },
    authScopes: { signedIn: true },
    // The name is read through `getIngredient`, which reaches a retired entry
    // the coven still holds (claude-docs/db/workspace-compendium-entries.md,
    // "When the compendium retires the entry"); the loader would miss it.
    resolve: async (
      _root,
      { workspaceId, ingredientId, input, expectedRevision },
      { loaders, ...context },
    ) =>
      nodeOf(
        await annotateCupboardEntry(
          sessionOf(context),
          workspaceId,
          ingredientId,
          input,
          expectedRevision ?? null,
        ),
        loaders,
        () => getIngredient(sessionOf(context), ingredientId, workspaceId),
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
    "What Make It Ours could not carry onto the coven's new own entry, by name, each list sorted: a folk name its new name took. The other lists stay empty.",
  fields: (t) => ({
    forms: t.exposeStringList('forms', {
      description: 'Always empty for a Make It Ours: every form is copied.',
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

const ConvertedCompendiumRef = builder
  .objectRef<ConvertedCompendium>('ConvertedCompendium')
  .implement({
    description:
      "A compendium entry made the coven's own: the own entry written, and what it could not carry.",
    fields: (t) => ({
      entry: t.field({ type: IngredientRef, resolve: (converted) => converted.entry }),
      dropped: t.field({ type: DroppedOnConvertRef, resolve: (converted) => converted.dropped }),
    }),
  });

builder.mutationField('convertCompendiumEntryToLocal', (t) =>
  t.field({
    type: ConvertedCompendiumRef,
    description:
      "Makes a compendium entry the coven holds its own: a new own entry from the coven's reading of it, with copies of its forms, folk names, substitutes, categories, references and deities; its jars and spell layers move to the copy's forms of the same name, and the cupboard entry is removed. Works on an entry the compendium has retired. The compendium entry is not changed.",
    args: {
      workspaceId: t.arg.id({ required: true }),
      ingredientId: t.arg.id({ required: true }),
    },
    authScopes: { signedIn: true },
    resolve: async (_root, { workspaceId, ingredientId }, { loaders, ...context }) => {
      const converted = await convertCompendiumEntryToLocal(
        sessionOf(context),
        workspaceId,
        ingredientId,
      );
      clearCupboardEntry(loaders, { ingredientId, workspaceId });
      return converted;
    },
  }),
);
