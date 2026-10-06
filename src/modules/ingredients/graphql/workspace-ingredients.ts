import { builder } from '../../../graphql/builder';
import { Forbidden } from '../../../lib/errors';
import {
  createWorkspaceIngredient,
  deleteWorkspaceIngredient,
  updateWorkspaceIngredient,
} from '../services/workspace-ingredients';
import { IngredientElementEnum, IngredientRef, NomenclatureEnum } from './ingredient';

// A coven's own ingredients, written as IngredientForm submits them. Neither
// input names a tier or a stamp: the coven is the argument the proof is asked
// for, and the stamps are the session's (claude-docs/graphql/schema.md, "The workspace
// ingredient mutations").

/**
 * One substitute: an ingredient to link, or the name of one not entered —
 * exactly one, which the shared schema holds rather than the type, as GraphQL
 * has no one-of input here (DESIGN.md §5, `ingredient_substitutes`).
 */
const SubstituteInput = builder.inputType('SubstituteInput', {
  description: 'An ingredient to link, or the name of one not entered: exactly one of the two.',
  fields: (t) => ({
    ingredientId: t.id(),
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
    description: t.string(),
    element: t.field({ type: IngredientElementEnum }),
    planets: t.stringList(),
    zodiacSigns: t.stringList(),
    deities: t.stringList(),
    colors: t.stringList(),
    safetyNotes: t.string(),
    substitutes: t.field({ type: [SubstituteInput] }),
    folkNames: t.stringList(),
  }),
});

// An update replaces the row, so a field left out would be cleared. Non-null
// makes leaving one out a schema error; GraphQL has no required-but-nullable
// field, so a caller clears with an empty value instead of null. `element` is
// the exception: an enum has no empty value to send.
const IngredientUpdateInput = builder.inputType('IngredientUpdateInput', {
  description:
    'The whole ingredient, replacing the row. Every field is sent, and "" or [] clears one; `element` alone is nullable, and null or leaving it out clears it.',
  fields: (t) => ({
    name: t.string({ required: true }),
    canonicalName: t.string({ required: true }),
    nomenclature: t.field({ type: NomenclatureEnum, required: true }),
    form: t.string({ required: true }),
    description: t.string({ required: true }),
    element: t.field({ type: IngredientElementEnum }),
    planets: t.stringList({ required: true }),
    zodiacSigns: t.stringList({ required: true }),
    deities: t.stringList({ required: true }),
    colors: t.stringList({ required: true }),
    safetyNotes: t.string({ required: true }),
    substitutes: t.field({ type: [SubstituteInput], required: true }),
    folkNames: t.stringList({ required: true }),
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
      // may have read this entry's folk names or substitutes; the answer must
      // be this write's.
      loaders.folkNamesByIngredient.clear(row);
      loaders.substitutesByIngredient.clear(row);
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
