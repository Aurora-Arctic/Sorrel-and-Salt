import { builder } from '../../../graphql/builder';
import { sessionOf } from '../../../graphql/context-helpers';
import {
  countCompendiumEntryUsers,
  createCompendiumEntry,
  deleteCompendiumEntry,
  setCompendiumEntryReviewed,
  setCompendiumEntryShown,
  updateCompendiumEntry,
} from '../services/compendium';
import { clearIngredientChildren } from '../loaders/ingredient-children';
import { EXPECTED_REVISION, IngredientRef } from './ingredient';
import { ingredientInputFields } from './ingredient-input';

// The compendium's writes, a curator's or an admin's: scoped here
// and refused again by the service, which is the real gate, as the
// category writes are. Neither input names a tier or a stamp — the
// compendium is the mutation, and the stamps are the session's.

const SHOWN =
  'Whether the public compendium lists the entry. Left out, a create is shown and an update leaves the flag as it is.';

/** A compendium entry as the admin's form sends it: `IngredientInput`'s fields with `nomenclature` required, as the compendium declares one for every entry. */
const CompendiumIngredientInput = builder.inputType('CompendiumIngredientInput', {
  fields: (t) => ({
    ...ingredientInputFields(t, { tier: 'compendium', whole: false }),
    shown: t.boolean({ required: false, description: SHOWN }),
  }),
});

// An update replaces the entry, so a field left out would be cleared — the
// categories above all, which the form may not show. Non-null makes leaving
// one out a schema error, and "" or [] clears one, as `IngredientUpdateInput`
// does for a coven's.
const CompendiumIngredientUpdateInput = builder.inputType('CompendiumIngredientUpdateInput', {
  description: 'The whole entry, replacing the row. Every field is sent, and "" or [] clears one.',
  fields: (t) => ({
    ...ingredientInputFields(t, { tier: 'compendium', whole: true }),
    shown: t.boolean({ required: false, description: SHOWN }),
  }),
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
    authScopes: { curator: true },
    resolve: (_root, { input, endRedirect }, context) =>
      createCompendiumEntry(sessionOf(context), {
        ...input,
        endRedirect: endRedirect ?? undefined,
      }),
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
      expectedRevision: t.arg.int({
        required: false,
        description: EXPECTED_REVISION,
      }),
    },
    authScopes: { curator: true },
    resolve: async (
      _root,
      { id, input, endRedirect, expectedRevision },
      { loaders, ...context },
    ) => {
      const row = await updateCompendiumEntry(
        sessionOf(context),
        id,
        { ...input, endRedirect: endRedirect ?? undefined },
        expectedRevision ?? null,
      );
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
    authScopes: { curator: true },
    resolve: async (_root, { id }, context) => {
      await deleteCompendiumEntry(sessionOf(context), id);
      return id;
    },
  }),
);

// The curator's review mark: set or cleared by hand, curator-scoped
// here and refused again by the service. It answers the entry and never the
// mark, which `Ingredient` does not carry: the admin page reads it through
// the service, and a client refreshes after the write.
builder.mutationField('setCompendiumEntryReviewed', (t) =>
  t.field({
    type: IngredientRef,
    description:
      'Marks the entry reviewed by a curator, or clears the mark so it needs review. Curators and admins only.',
    args: {
      id: t.arg.id({ required: true }),
      reviewed: t.arg.boolean({ required: true }),
    },
    authScopes: { curator: true },
    resolve: (_root, { id, reviewed }, context) =>
      setCompendiumEntryReviewed(sessionOf(context), id, reviewed),
  }),
);

// Hiding an entry: curator-scoped here and refused again by the service. A hidden entry
// leaves the public compendium and its files; admin screens and covens' cupboards still hold it.
builder.mutationField('setCompendiumEntryShown', (t) =>
  t.field({
    type: IngredientRef,
    description: 'Shows the entry on the public compendium, or hides it. Curators and admins only.',
    args: {
      id: t.arg.id({ required: true }),
      shown: t.arg.boolean({ required: true }),
    },
    authScopes: { curator: true },
    resolve: (_root, { id, shown }, context) =>
      setCompendiumEntryShown(sessionOf(context), id, shown),
  }),
);

// The delete confirm's number: a read, curator-scoped here and
// refused again by the service. A count only, so no coven is named.
builder.queryField('compendiumEntryUsers', (t) =>
  t.int({
    description:
      'How many covens hold this compendium entry in their cupboard; a count, never who. Curators and admins only.',
    args: { id: t.arg.id({ required: true }) },
    authScopes: { curator: true },
    resolve: (_root, { id }, context) => countCompendiumEntryUsers(sessionOf(context), id),
  }),
);
