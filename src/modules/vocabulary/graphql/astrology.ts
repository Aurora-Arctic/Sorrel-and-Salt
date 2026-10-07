import { builder } from '../../../graphql/builder';
import { Forbidden } from '../../../lib/errors';
import {
  countAstrologyValues,
  createAstrologyValue,
  deleteAstrologyValue,
  listAstrologyValues,
  updateAstrologyValue,
} from '../services/astrology';
import type { AstrologyValueRow, CuratedField } from '../types';

// `Planet` and `ZodiacSign`: the two curated astrology vocabularies (MB.95),
// one type each though the rows share a shape, so a client never asks which
// table a value came from. Public (MB.80), so no scope and no session in the
// readers; tests/db/graphql-query-scopes.test.ts holds every other query to
// its refusal. The writes are the site admin's, scoped here and refused again
// by the service, which is the real gate.

/** How each vocabulary is named on the schema. */
const VOCABULARIES = [
  { field: 'planets', type: 'Planet', noun: 'planet', listNoun: 'planets' },
  { field: 'zodiacSigns', type: 'ZodiacSign', noun: 'sign', listNoun: 'zodiac signs' },
] as const satisfies readonly {
  field: CuratedField;
  type: string;
  noun: string;
  listNoun: string;
}[];

/** The list's arguments as the service's filter: GraphQL's null is absent. */
const filterOf = (args: { query?: string | null }) => ({ query: args.query ?? undefined });

for (const { field, type, noun, listNoun } of VOCABULARIES) {
  const ref = builder.objectRef<AstrologyValueRow>(type).implement({
    fields: (t) => ({
      id: t.exposeID('id'),
      name: t.exposeString('name'),
      slug: t.exposeString('slug'),
      description: t.exposeString('description'),
    }),
  });

  builder.queryField(field, (t) =>
    t.pagedConnection({
      type: ref,
      description: `The curated ${listNoun} by name: those whose name holds \`query\`, case-insensitively, when given.`,
      args: { query: t.arg.string({ required: false }) },
      resolve: (_query, args, page) => listAstrologyValues(field, filterOf(args), page),
      // "Page X of Y" (claude-docs/graphql/pagination.md, "Pagination").
      count: (_query, args, start) => countAstrologyValues(field, filterOf(args), start),
    }),
  );

  /** A value as the admin writes one, whole: no slug, which follows the name. */
  const input = builder.inputType(`${type}Input`, {
    fields: (t) => ({
      name: t.string({ required: true }),
      description: t.string({ required: true }),
    }),
  });

  builder.mutationField(`create${type}`, (t) =>
    t.field({
      type: ref,
      args: { input: t.arg({ type: input, required: true }) },
      authScopes: { admin: true },
      resolve: (_root, args, { session }) => {
        if (!session) throw new Forbidden();
        return createAstrologyValue(session, field, args.input);
      },
    }),
  );

  builder.mutationField(`update${type}`, (t) =>
    t.field({
      type: ref,
      description: `Replaces the ${noun}; the slug follows the name. A rename is carried onto every live compendium entry listing it.`,
      args: {
        id: t.arg.id({ required: true }),
        input: t.arg({ type: input, required: true }),
      },
      authScopes: { admin: true },
      resolve: (_root, args, { session }) => {
        if (!session) throw new Forbidden();
        return updateAstrologyValue(session, field, args.id, args.input);
      },
    }),
  );

  builder.mutationField(`delete${type}`, (t) =>
    t.id({
      description: `A soft delete, refused while a live compendium entry lists the ${noun}; a coven keeps what it wrote.`,
      args: { id: t.arg.id({ required: true }) },
      authScopes: { admin: true },
      resolve: async (_root, args, { session }) => {
        if (!session) throw new Forbidden();
        await deleteAstrologyValue(session, field, args.id);
        return args.id;
      },
    }),
  );
}
