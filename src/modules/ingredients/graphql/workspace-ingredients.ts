import { builder } from '../../../graphql/builder';
import { Forbidden } from '../../../lib/errors';
import {
  createWorkspaceIngredient,
  deleteWorkspaceIngredient,
  updateWorkspaceIngredient,
} from '../services/workspace-ingredients';
import { clearIngredientChildren } from '../loaders/ingredient-children';
import { IngredientRef } from './ingredient';
import { ingredientInputFields } from './ingredient-input';

// A coven's own ingredients, written as IngredientForm submits them. Neither
// input names a tier or a stamp: the coven is the argument the proof is asked
// for, and the stamps are the session's (claude-docs/graphql/schema.md, "The workspace
// ingredient mutations").

/** DESIGN.md §7's `IngredientInput`: only `name` is required, so story 29's stub saves. */
const IngredientInput = builder.inputType('IngredientInput', {
  fields: (t) => ingredientInputFields(t, { tier: 'coven', whole: false }),
});

// An update replaces the row, so a field left out would be cleared. Non-null
// makes leaving one out a schema error; GraphQL has no required-but-nullable
// field, so a caller clears with an empty value instead of null — which is
// why `elements` is a list (MB.157): a single enum had no empty value to send.
const IngredientUpdateInput = builder.inputType('IngredientUpdateInput', {
  description:
    'The whole ingredient, replacing the row. Every field is sent, and "" or [] clears one.',
  fields: (t) => ingredientInputFields(t, { tier: 'coven', whole: true }),
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
      clearIngredientChildren(loaders, row);
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
