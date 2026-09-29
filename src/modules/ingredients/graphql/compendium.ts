import { builder } from '../../../graphql/builder';
import { countCompendium, getIngredient, listCompendium } from '../services/compendium';
import { IngredientRef } from './ingredient';

// The compendium's two queries. Public, so neither carries the `signedIn`
// scope (MB.80); tests/db/graphql-query-scopes.test.ts holds every other
// query to its refusal. The filtering is the service's, in SQL: the browser
// never holds more than a page, so it cannot be the search
// (claude-docs/graphql.md, "compendium, ingredient and ingredientFormValues").

builder.queryField('compendium', (t) =>
  t.pagedConnection({
    type: IngredientRef,
    args: {
      search: t.arg.string({ required: false }),
      categoryIds: t.arg.idList({ required: false }),
      form: t.arg.string({ required: false }),
    },
    resolve: (_query, { search, categoryIds, form }, page) =>
      listCompendium({ search, categoryIds, form }, page),
    // "Page X of Y" (claude-docs/graphql.md, "Pagination").
    count: (_query, { search, categoryIds, form }, start) =>
      countCompendium({ search, categoryIds, form }, start),
    edgeFields: (t) => ({
      score: t.float({
        nullable: true,
        description:
          'The word similarity of the search term to the entry, 0 to 1 — its best across the label, formal name and folk names. Null without a search.',
        resolve: (edge) => edge.score,
      }),
    }),
  }),
);

builder.queryField('ingredient', (t) =>
  t.field({
    type: IngredientRef,
    args: {
      id: t.arg.id({ required: true }),
      // Names the coven whose own entry may be asked for; absent, the read is
      // the compendium alone.
      workspaceId: t.arg.id({ required: false }),
    },
    resolve: (_query, { id, workspaceId }, { session }) => getIngredient(session, id, workspaceId),
  }),
);
