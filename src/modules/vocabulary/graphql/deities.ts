import { builder } from '../../../graphql/builder';
import { definedArgs } from '../../../graphql/context-helpers';
import {
  countDeities,
  createDeity,
  deleteDeity,
  listDeities,
  updateDeity,
} from '../services/deities';
import {
  createDeityTradition,
  deleteDeityTradition,
  listDeityTraditions,
  updateDeityTradition,
} from '../services/deity-traditions';
import type { DeityRow, DeityTraditionRow } from '../types';
import { curatedVocabularyWrites } from './curated';

// A curated deity and its tradition, as an ingredient's picked deity reads them: the shape `IngredientFormValue` and its group have, since a tradition
// tells two same-named deities apart as a group does two forms. Public, so no scope in the readers; tests/db/graphql-query-scopes.test.ts holds every other query to its refusal.

export const DeityTraditionRef = curatedVocabularyWrites({
  ref: builder.objectRef<DeityTraditionRow>('DeityTradition'),
  services: {
    create: createDeityTradition,
    update: updateDeityTradition,
    delete: deleteDeityTradition,
  },
  moveTo: [],
  // An earlier root field of this request may have read it as a deity's
  // tradition, or a deity it re-slugged or moved as an ingredient's pick.
  clears: ['deityTraditionsById', 'deitiesByIngredient'],
  descriptions: {
    update:
      'Replaces the tradition; the slug follows the name, and so does the slug of every deity under it.',
    delete:
      'A soft delete; the live deities under it move to `moveTo` first, re-slugged there, which they need when there are any.',
  },
});

/**
 * `DeityInput` is the admin's, rather than the ingredient's pick, which is
 * `IngredientDeityInput`.
 */
export const DeityRef = curatedVocabularyWrites({
  ref: builder.objectRef<DeityRow>('Deity'),
  // The tradition is what tells two same-named deities apart: "Hecate (Greek)".
  parent: {
    field: 'tradition',
    key: 'traditionId',
    type: DeityTraditionRef,
    loader: (loaders) => loaders.deityTraditionsById,
  },
  // The names a source may call the deity by, written whole with it:
  // a save brings the stored names to the list sent, an absent list clearing them.
  fields: (t) => ({
    otherNames: t.stringList({
      description: 'The other names the deity answers to, alphabetically.',
      resolve: (deity, _args, context) => context.loaders.otherNamesByDeity.load(deity.id),
    }),
  }),
  input: (t) => ({
    otherNames: t.stringList({ required: false }),
  }),
  services: { create: createDeity, update: updateDeity, delete: deleteDeity },
  // An earlier root field of this request may have read it as an ingredient's
  // pick, or read its other names.
  clears: ['deitiesByIngredient', 'otherNamesByDeity'],
  descriptions: {
    update:
      'Replaces the deity; the slug follows the name and the tradition. A rename is carried onto every live compendium entry that picked the deity.',
    delete:
      'A soft delete, refused while a live compendium entry picked the deity; a coven keeps its pick.',
  },
});

builder.queryField('deities', (t) =>
  t.pagedConnection({
    type: DeityRef,
    description:
      "The curated deities, each under a live tradition, by the tradition's name and then their own: those whose name holds `query`, case-insensitively, and those filed under `traditionId`, when given.",
    args: {
      query: t.arg.string({ required: false }),
      traditionId: t.arg.id({ required: false }),
    },
    resolve: (_query, { query, traditionId }, page) =>
      listDeities(definedArgs({ query, traditionId }), page),
    // "Page X of Y" (claude-docs/graphql/pagination.md, "Pagination").
    count: (_query, { query, traditionId }, start) =>
      countDeities(definedArgs({ query, traditionId }), start),
  }),
);

builder.queryField('deityTraditions', (t) =>
  t.pagedConnection({
    type: DeityTraditionRef,
    description:
      'The live traditions by name: the tradition a deity is filed under is picked from these.',
    resolve: (_query, _args, page) => listDeityTraditions(page),
  }),
);
