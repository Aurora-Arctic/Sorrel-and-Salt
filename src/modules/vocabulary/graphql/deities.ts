import { builder } from '../../../graphql/builder';
import { Forbidden } from '../../../lib/errors';
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
import type { DeityFilter, DeityRow, DeityTraditionRow } from '../types';

// A curated deity and its tradition, as an ingredient's picked deity reads
// them (MB.167): the shape `IngredientFormValue` and its group have, since a
// tradition tells two same-named deities apart as a group does two forms.
// Public reference data (MB.80), so no scope and no session in the readers;
// tests/db/graphql-query-scopes.test.ts holds every other query to its
// refusal. The writes are the site admin's (MB.132), scoped here and refused
// again by the service, which is the real gate.

export const DeityTraditionRef = builder.objectRef<DeityTraditionRow>('DeityTradition').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    slug: t.exposeString('slug'),
    description: t.exposeString('description'),
  }),
});

export const DeityRef = builder.objectRef<DeityRow>('Deity').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    slug: t.exposeString('slug'),
    description: t.exposeString('description'),
    // The tradition is what tells two same-named deities apart: "Hecate (Greek)".
    tradition: t.field({
      type: DeityTraditionRef,
      resolve: (deity, _args, { loaders }) => loaders.deityTraditionsById.load(deity.traditionId),
    }),
  }),
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
    resolve: (_query, args, page) => listDeities(deityFilter(args), page),
    // "Page X of Y" (claude-docs/graphql/pagination.md, "Pagination").
    count: (_query, args, start) => countDeities(deityFilter(args), start),
  }),
);

/** The list's arguments as the service's filter: GraphQL's null is absent. */
function deityFilter(args: { query?: string | null; traditionId?: string | null }): DeityFilter {
  return { query: args.query ?? undefined, traditionId: args.traditionId ?? undefined };
}

builder.queryField('deityTraditions', (t) =>
  t.pagedConnection({
    type: DeityTraditionRef,
    description:
      'The live traditions by name: the tradition a deity is filed under is picked from these.',
    resolve: (_query, _args, page) => listDeityTraditions(page),
  }),
);

/**
 * A deity as the admin writes one, whole: no slug, which follows the name.
 * `DeityInput` rather than the ingredient's pick, which is `IngredientDeityInput`
 * (MB.167).
 */
const DeityInput = builder.inputType('DeityInput', {
  fields: (t) => ({
    name: t.string({ required: true }),
    description: t.string({ required: true }),
    traditionId: t.id({ required: true }),
  }),
});

builder.mutationField('createDeity', (t) =>
  t.field({
    type: DeityRef,
    args: { input: t.arg({ type: DeityInput, required: true }) },
    authScopes: { admin: true },
    resolve: (_root, { input }, { session }) => {
      if (!session) throw new Forbidden();
      return createDeity(session, input);
    },
  }),
);

builder.mutationField('updateDeity', (t) =>
  t.field({
    type: DeityRef,
    description:
      'Replaces the deity; the slug follows the name and the tradition. A rename is carried onto every live compendium entry that picked the deity.',
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: DeityInput, required: true }),
    },
    authScopes: { admin: true },
    resolve: async (_root, { id, input }, { session, loaders }) => {
      if (!session) throw new Forbidden();
      const row = await updateDeity(session, id, input);
      // An earlier root field of this request may have read it as an ingredient's pick.
      loaders.deitiesByIngredient.clearAll();
      return row;
    },
  }),
);

builder.mutationField('deleteDeity', (t) =>
  t.id({
    description:
      'A soft delete, refused while a live compendium entry picked the deity; a coven keeps its pick.',
    args: { id: t.arg.id({ required: true }) },
    authScopes: { admin: true },
    resolve: async (_root, { id }, { session, loaders }) => {
      if (!session) throw new Forbidden();
      await deleteDeity(session, id);
      loaders.deitiesByIngredient.clearAll();
      return id;
    },
  }),
);

/** A tradition as the admin writes one, whole: no slug, which follows the name. */
const DeityTraditionInput = builder.inputType('DeityTraditionInput', {
  fields: (t) => ({
    name: t.string({ required: true }),
    description: t.string({ required: true }),
  }),
});

builder.mutationField('createDeityTradition', (t) =>
  t.field({
    type: DeityTraditionRef,
    args: { input: t.arg({ type: DeityTraditionInput, required: true }) },
    authScopes: { admin: true },
    resolve: (_root, { input }, { session }) => {
      if (!session) throw new Forbidden();
      return createDeityTradition(session, input);
    },
  }),
);

builder.mutationField('updateDeityTradition', (t) =>
  t.field({
    type: DeityTraditionRef,
    description:
      'Replaces the tradition; the slug follows the name, and so does the slug of every deity under it.',
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: DeityTraditionInput, required: true }),
    },
    authScopes: { admin: true },
    resolve: async (_root, { id, input }, { session, loaders }) => {
      if (!session) throw new Forbidden();
      const row = await updateDeityTradition(session, id, input);
      // An earlier root field of this request may have read it as a deity's
      // tradition, or a deity it re-slugged as an ingredient's pick.
      loaders.deityTraditionsById.clearAll();
      loaders.deitiesByIngredient.clearAll();
      return row;
    },
  }),
);

builder.mutationField('deleteDeityTradition', (t) =>
  t.id({
    description:
      'A soft delete; the live deities under it move to `moveTo` first, re-slugged there, which they need when there are any.',
    args: { id: t.arg.id({ required: true }), moveTo: t.arg.id({ required: false }) },
    authScopes: { admin: true },
    resolve: async (_root, { id, moveTo }, { session, loaders }) => {
      if (!session) throw new Forbidden();
      await deleteDeityTradition(session, id, moveTo ?? undefined);
      // A deity read earlier carries the tradition it was moved off.
      loaders.deityTraditionsById.clearAll();
      loaders.deitiesByIngredient.clearAll();
      return id;
    },
  }),
);
