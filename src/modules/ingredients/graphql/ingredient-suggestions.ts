import { builder } from '../../../graphql/builder';
import { sessionOf } from '../../../graphql/context-helpers';
import { suggestIngredients } from '../services/ingredient-suggestions';
import { IngredientRef } from './ingredient';

// The substitute picker's search (MB.138), which MB.131's combobox reads. The
// resolver refuses only a missing session; which covens a caller may ask about
// is the service's check (claude-docs/graphql/schema.md, "ingredientSuggestions").

builder.queryField('ingredientSuggestions', (t) =>
  t.pagedConnection({
    type: IngredientRef,
    args: {
      workspaceId: t.arg.id({ required: true }),
      query: t.arg.string({ required: false }),
    },
    resolve: (_root, { workspaceId, query }, page, context) =>
      suggestIngredients(sessionOf(context), workspaceId, query ?? '', page),
  }),
);
