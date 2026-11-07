import { builder } from '../../../graphql/builder';
import { definedArgs } from '../../../graphql/context-helpers';
import {
  countAstrologyValues,
  createAstrologyValue,
  deleteAstrologyValue,
  listAstrologyValues,
  updateAstrologyValue,
} from '../services/astrology';
import type { AstrologyValueRow, CuratedField } from '../types';
import { curatedVocabularyWrites } from './curated';

// Public, so no scope in the readers; tests/db/graphql-query-scopes.test.ts holds every other query to its refusal. The writes are the site admin's.

const VOCABULARIES = [
  {
    field: 'celestialBodies',
    type: 'CelestialBody',
    noun: 'celestial body',
    listNoun: 'celestial bodies',
  },
  { field: 'zodiacSigns', type: 'ZodiacSign', noun: 'sign', listNoun: 'zodiac signs' },
] as const satisfies readonly {
  field: CuratedField;
  type: string;
  noun: string;
  listNoun: string;
}[];

for (const { field, type, noun, listNoun } of VOCABULARIES) {
  const ref = curatedVocabularyWrites({
    ref: builder.objectRef<AstrologyValueRow>(type),
    services: {
      create: (session, input) => createAstrologyValue(session, field, input),
      update: (session, id, input) => updateAstrologyValue(session, field, id, input),
      delete: (session, id) => deleteAstrologyValue(session, field, id),
    },
    // Nothing reads a celestial body or a sign through a loader: an entry holds the name.
    clears: [],
    descriptions: {
      update: `Replaces the ${noun}; the slug follows the name. A rename is carried onto every live compendium entry listing it.`,
      delete: `A soft delete, refused while a live compendium entry lists the ${noun}; a coven keeps what it wrote.`,
    },
  });

  builder.queryField(field, (t) =>
    t.pagedConnection({
      type: ref,
      description: `The curated ${listNoun} by name: those whose name holds \`query\`, case-insensitively, when given.`,
      args: { query: t.arg.string({ required: false }) },
      resolve: (_query, { query }, page) =>
        listAstrologyValues(field, definedArgs({ query }), page),
      // "Page X of Y" (claude-docs/graphql/pagination.md, "Pagination").
      count: (_query, { query }, start) =>
        countAstrologyValues(field, definedArgs({ query }), start),
    }),
  );
}
