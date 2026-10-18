import { builder } from '../../../graphql/builder';
import { sessionOf } from '../../../graphql/context-helpers';
import { suggestIngredients } from '../services/ingredient-suggestions';
import { IngredientRef } from './ingredient';

// Which of the picker's two groups an entry is listed in (M12.19).
const SuggestionGroupEnum = builder.enumType('SuggestionGroup', {
  values: ['yours', 'compendium'] as const,
  description:
    "Where the substitute picker lists an entry: the coven's own cupboard (yours), or the rest of the compendium.",
});

// The substitute picker's search (MB.138), which MB.131's combobox reads. The
// resolver refuses only a missing session; which covens a caller may ask about
// is the service's check (claude-docs/graphql/schema.md, "ingredientSuggestions").

builder.queryField('ingredientSuggestions', (t) =>
  t.pagedConnection({
    type: IngredientRef,
    args: {
      workspaceId: t.arg.id({ required: true }),
      query: t.arg.string({ required: false }),
      form: t.arg.string({ required: false }),
    },
    resolve: (_root, { workspaceId, query, form }, page, context) =>
      suggestIngredients(sessionOf(context), workspaceId, query ?? '', page, form ?? undefined),
    edgeFields: (t) => ({
      group: t.field({
        type: SuggestionGroupEnum,
        description:
          'Yours: an entry of the coven, its own or one it holds from the compendium. Compendium: an entry it does not hold. Yours is listed first, then the compendium, each ranked by match.',
        resolve: (edge) => edge.group,
      }),
    }),
  }),
);
