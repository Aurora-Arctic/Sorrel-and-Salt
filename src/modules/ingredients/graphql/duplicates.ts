import { builder } from '../../../graphql/builder';
import { Forbidden } from '../../../lib/errors';
import { findPossibleDuplicates } from '../services/duplicates';
import { IngredientRef } from './ingredient';

// M5.10's "did you mean": M4.7's duplicate lookup, a page at a time. The
// resolver refuses only a missing session; which covens a caller may ask about
// is the service's check (claude-docs/graphql/schema.md, "possibleDuplicates").

builder.queryField('possibleDuplicates', (t) =>
  t.pagedConnection({
    type: IngredientRef,
    args: {
      // Null reads the compendium alone: the admin's compendium form names no coven (M5.5).
      workspaceId: t.arg.id({ required: false }),
      name: t.arg.string({ required: true }),
    },
    resolve: (_query, { workspaceId, name }, page, { session }) => {
      if (!session) throw new Forbidden();
      return findPossibleDuplicates(session, workspaceId, name, page);
    },
    edgeFields: (t) => ({
      score: t.float({
        description:
          "The name's trigram similarity to the entry, 0.4 to 1 — its best across the label, formal name and folk names. 1 is an exact match.",
        resolve: (edge) => edge.score,
      }),
    }),
  }),
);
