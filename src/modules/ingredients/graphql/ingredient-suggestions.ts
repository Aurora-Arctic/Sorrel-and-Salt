import { builder } from '../../../graphql/builder';
import { Forbidden } from '../../../lib/errors';
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
    resolve: (_root, { workspaceId, query }, page, { session }) => {
      if (!session) throw new Forbidden();
      return suggestIngredients(session, workspaceId, query ?? '', page);
    },
  }),
);
