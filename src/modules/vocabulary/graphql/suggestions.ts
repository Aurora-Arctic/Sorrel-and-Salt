import { builder } from '../../../graphql/builder';
import { Forbidden } from '../../../lib/errors';
import {
  type VocabularySuggestion,
  suggestPlanets,
  suggestZodiacSigns,
} from '../services/suggestions';

export const CorrespondenceSuggestionRef = builder
  .objectRef<VocabularySuggestion>('CorrespondenceSuggestion')
  .implement({
    fields: (t) => ({
      value: t.exposeString('value'),
      description: t.exposeString('description', { nullable: true }),
      curated: t.exposeBoolean('curated'),
    }),
  });

// One type for both fields: a planet and a sign suggestion carry the same
// three things, and neither carries a group (claude-docs/graphql.md).
const FIELDS = { planetSuggestions: suggestPlanets, zodiacSuggestions: suggestZodiacSigns };

for (const [name, suggest] of Object.entries(FIELDS)) {
  builder.queryField(name, (t) =>
    t.pagedConnection({
      type: CorrespondenceSuggestionRef,
      args: {
        workspaceId: t.arg.id({ required: true }),
        term: t.arg.string({ required: false }),
      },
      resolve: (_query, { workspaceId, term }, page, { session }) => {
        if (!session) throw new Forbidden();
        return suggest(session, workspaceId, term ?? '', page);
      },
    }),
  );
}
