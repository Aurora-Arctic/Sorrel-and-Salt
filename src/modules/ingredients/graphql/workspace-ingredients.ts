import { builder } from '../../../graphql/builder';
import { Forbidden } from '../../../lib/errors';
import {
  createWorkspaceIngredient,
  deleteWorkspaceIngredient,
  updateWorkspaceIngredient,
} from '../services/workspace-ingredients';
import { IngredientElementEnum, IngredientRef, NomenclatureEnum } from './ingredient';
import { ReferenceLinkInput } from './references';

// A coven's own ingredients, written as IngredientForm submits them. Neither
// input names a tier or a stamp: the coven is the argument the proof is asked
// for, and the stamps are the session's (claude-docs/graphql/schema.md, "The workspace
// ingredient mutations").

/**
 * One substitute: an ingredient to link, or the name of one not entered —
 * exactly one, which the shared schema holds rather than the type, as GraphQL
 * has no one-of input here (DESIGN.md §5, `ingredient_substitutes`).
 */
export const SubstituteInput = builder.inputType('SubstituteInput', {
  description: 'An ingredient to link, or the name of one not entered: exactly one of the two.',
  fields: (t) => ({
    ingredientId: t.id(),
    name: t.string(),
  }),
});

/**
 * One deity: the curated one picked, or a name typed — exactly one, held by
 * the shared schema as `SubstituteInput` is (DESIGN.md §5, `ingredient_deities`).
 */
export const IngredientDeityInput = builder.inputType('IngredientDeityInput', {
  description: 'A curated deity picked, or a name typed: exactly one of the two.',
  fields: (t) => ({
    deityId: t.id(),
    name: t.string(),
  }),
});

/** DESIGN.md §7's `IngredientInput`: only `name` is required, so story 29's stub saves. */
const IngredientInput = builder.inputType('IngredientInput', {
  fields: (t) => ({
    name: t.string({ required: true }),
    canonicalName: t.string(),
    nomenclature: t.field({ type: NomenclatureEnum }),
    form: t.string(),
    formId: t.id({ description: 'The curated form picked for `form`; none when it was typed.' }),
    description: t.string(),
    elements: t.field({ type: [IngredientElementEnum] }),
    planets: t.stringList(),
    zodiacSigns: t.stringList(),
    deities: t.field({ type: [IngredientDeityInput] }),
    colors: t.stringList(),
    safetyNotes: t.string(),
    substitutes: t.field({ type: [SubstituteInput] }),
    references: t.field({ type: [ReferenceLinkInput] }),
    folkNames: t.stringList(),
    categoryIds: t.idList({ description: 'The categories it is filed under.' }),
  }),
});

// An update replaces the row, so a field left out would be cleared. Non-null
// makes leaving one out a schema error; GraphQL has no required-but-nullable
// field, so a caller clears with an empty value instead of null — which is
// why `elements` is a list (MB.157): a single enum had no empty value to send.
const IngredientUpdateInput = builder.inputType('IngredientUpdateInput', {
  description:
    'The whole ingredient, replacing the row. Every field is sent, and "" or [] clears one.',
  fields: (t) => ({
    name: t.string({ required: true }),
    canonicalName: t.string({ required: true }),
    nomenclature: t.field({ type: NomenclatureEnum, required: true }),
    form: t.string({ required: true }),
    formId: t.id({
      required: true,
      description: 'The curated form picked for `form`; "" when it was typed.',
    }),
    description: t.string({ required: true }),
    elements: t.field({ type: [IngredientElementEnum], required: true }),
    planets: t.stringList({ required: true }),
    zodiacSigns: t.stringList({ required: true }),
    deities: t.field({ type: [IngredientDeityInput], required: true }),
    colors: t.stringList({ required: true }),
    safetyNotes: t.string({ required: true }),
    substitutes: t.field({ type: [SubstituteInput], required: true }),
    references: t.field({ type: [ReferenceLinkInput], required: true }),
    folkNames: t.stringList({ required: true }),
    categoryIds: t.idList({
      required: true,
      description: 'The categories it is filed under; [] when none.',
    }),
  }),
});

builder.mutationField('createWorkspaceIngredient', (t) =>
  t.field({
    type: IngredientRef,
    args: {
      workspaceId: t.arg.id({ required: true }),
      input: t.arg({ type: IngredientInput, required: true }),
    },
    authScopes: { signedIn: true },
    resolve: (_root, { workspaceId, input }, { session }) => {
      if (!session) throw new Forbidden();
      return createWorkspaceIngredient(session, workspaceId, input);
    },
  }),
);

builder.mutationField('updateIngredient', (t) =>
  t.field({
    type: IngredientRef,
    args: {
      workspaceId: t.arg.id({ required: true }),
      id: t.arg.id({ required: true }),
      input: t.arg({ type: IngredientUpdateInput, required: true }),
    },
    authScopes: { signedIn: true },
    resolve: async (_root, { workspaceId, id, input }, { session, loaders }) => {
      if (!session) throw new Forbidden();
      const row = await updateWorkspaceIngredient(session, workspaceId, id, input);
      // Root mutation fields run in turn within one request, so an earlier one
      // may have read this entry's folk names, substitutes, deities, references
      // or categories; the answer must be this write's.
      loaders.categoriesByIngredient.clear(row);
      loaders.folkNamesByIngredient.clear(row);
      loaders.substitutesByIngredient.clear(row);
      loaders.deitiesByIngredient.clear(row);
      loaders.referencesByIngredient.clear(row);
      return row;
    },
  }),
);

// Answers the deleted id, not the entity: a list evicts a row by its id, and a
// deleted ingredient's folk names and categories would resolve empty.
builder.mutationField('deleteIngredient', (t) =>
  t.id({
    args: {
      workspaceId: t.arg.id({ required: true }),
      id: t.arg.id({ required: true }),
    },
    authScopes: { signedIn: true },
    resolve: async (_root, { workspaceId, id }, { session }) => {
      if (!session) throw new Forbidden();
      await deleteWorkspaceIngredient(session, workspaceId, id);
      return id;
    },
  }),
);
