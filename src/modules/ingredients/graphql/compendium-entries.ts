import { builder } from '../../../graphql/builder';
import { Forbidden } from '../../../lib/errors';
import {
  createCompendiumEntry,
  deleteCompendiumEntry,
  updateCompendiumEntry,
} from '../services/compendium';
import { IngredientElementEnum, IngredientRef, NomenclatureEnum } from './ingredient';
import { ReferenceLinkInput } from './references';
import { IngredientDeityInput, SubstituteInput } from './workspace-ingredients';

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
  fields: (t) => ({
    name: t.string({ required: true }),
    canonicalName: t.string(),
    nomenclature: t.field({ type: NomenclatureEnum, required: true }),
    form: t.string(),
    formId: t.id({ description: 'The curated form picked for `form`.' }),
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

// An update replaces the entry, so a field left out would be cleared — the
// categories above all, which the form may not show. Non-null makes leaving
// one out a schema error, and "" or [] clears one, as `IngredientUpdateInput`
// does for a coven's (MB.159).
const CompendiumIngredientUpdateInput = builder.inputType('CompendiumIngredientUpdateInput', {
  description: 'The whole entry, replacing the row. Every field is sent, and "" or [] clears one.',
  fields: (t) => ({
    name: t.string({ required: true }),
    canonicalName: t.string({ required: true }),
    nomenclature: t.field({ type: NomenclatureEnum, required: true }),
    form: t.string({ required: true }),
    formId: t.id({
      required: true,
      description: 'The curated form picked for `form`; "" when there is none.',
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
      // As `updateIngredient`: an earlier root field of this request may have
      // read this entry's children, and the answer must be this write's.
      loaders.categoriesByIngredient.clear(row);
      loaders.folkNamesByIngredient.clear(row);
      loaders.substitutesByIngredient.clear(row);
      loaders.deitiesByIngredient.clear(row);
      loaders.referencesByIngredient.clear(row);
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
