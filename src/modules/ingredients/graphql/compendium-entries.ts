import { builder } from '../../../graphql/builder';
import { Forbidden } from '../../../lib/errors';
import {
  createCompendiumEntry,
  deleteCompendiumEntry,
  updateCompendiumEntry,
} from '../services/compendium';
import { clearIngredientChildren } from '../loaders/ingredient-children';
import { IngredientRef } from './ingredient';
import { ingredientInputFields } from './ingredient-input';

// The compendium's three writes (M5.5), the site admin's alone: scoped here
// and refused again by the service, which is the real gate, as M5.6's
// category writes are. Neither input names a tier or a stamp — the
// compendium is the mutation, and the stamps are the session's.

/**
 * A compendium entry as the admin's form sends it: `IngredientInput`'s fields,
 * with `nomenclature` required, since the compendium declares one for every
 * entry and the shared schema gives it no default here.
 */
const CompendiumIngredientInput = builder.inputType('CompendiumIngredientInput', {
  fields: (t) => ingredientInputFields(t, { tier: 'compendium', whole: false }),
});

// An update replaces the entry, so a field left out would be cleared — the
// categories above all, which the form may not show. Non-null makes leaving
// one out a schema error, and "" or [] clears one, as `IngredientUpdateInput`
// does for a coven's (MB.159).
const CompendiumIngredientUpdateInput = builder.inputType('CompendiumIngredientUpdateInput', {
  description: 'The whole entry, replacing the row. Every field is sent, and "" or [] clears one.',
  fields: (t) => ingredientInputFields(t, { tier: 'compendium', whole: true }),
});

const END_REDIRECT =
  "Confirms ending another entry's redirect from the address this write takes (MB.82).";

builder.mutationField('createCompendiumIngredient', (t) =>
  t.field({
    type: IngredientRef,
    args: {
      input: t.arg({ type: CompendiumIngredientInput, required: true }),
      endRedirect: t.arg.boolean({ required: false, description: END_REDIRECT }),
    },
    authScopes: { admin: true },
    resolve: (_root, { input, endRedirect }, { session }) => {
      if (!session) throw new Forbidden();
      return createCompendiumEntry(session, { ...input, endRedirect: endRedirect ?? undefined });
    },
  }),
);

builder.mutationField('updateCompendiumIngredient', (t) =>
  t.field({
    type: IngredientRef,
    description: 'Replaces the entry; the slug follows the name.',
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: CompendiumIngredientUpdateInput, required: true }),
      endRedirect: t.arg.boolean({ required: false, description: END_REDIRECT }),
    },
    authScopes: { admin: true },
    resolve: async (_root, { id, input, endRedirect }, { session, loaders }) => {
      if (!session) throw new Forbidden();
      const row = await updateCompendiumEntry(session, id, {
        ...input,
        endRedirect: endRedirect ?? undefined,
      });
      clearIngredientChildren(loaders, row);
      return row;
    },
  }),
);

// Answers the deleted id, as `deleteIngredient` does: a list evicts a row by its id.
builder.mutationField('deleteCompendiumIngredient', (t) =>
  t.id({
    description: 'A soft delete; a spell holding the entry still reaches it.',
    args: { id: t.arg.id({ required: true }) },
    authScopes: { admin: true },
    resolve: async (_root, { id }, { session }) => {
      if (!session) throw new Forbidden();
      await deleteCompendiumEntry(session, id);
      return id;
    },
  }),
);
