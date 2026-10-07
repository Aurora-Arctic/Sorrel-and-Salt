import { builder } from '../../../graphql/builder';
import { Forbidden } from '../../../lib/errors';
import { SuggestionClaimantRef } from '@/modules/vocabulary';
import { type CommonNameSuggestion, suggestCommonNames } from '../services/common-names';

export const CommonNameSuggestionRef = builder
  .objectRef<CommonNameSuggestion>('CommonNameSuggestion')
  .implement({
    fields: (t) => ({
      value: t.exposeString('value'),
      claimants: t.field({ type: [SuggestionClaimantRef], resolve: (s) => s.claimants }),
    }),
  });

builder.queryField('commonNameSuggestions', (t) =>
  t.pagedConnection({
    type: CommonNameSuggestionRef,
    args: {
      // Null reads the compendium alone: the admin's compendium form names no coven (M5.5).
      workspaceId: t.arg.id({ required: false }),
      query: t.arg.string({ required: false }),
    },
    resolve: (_root, { workspaceId, query }, page, { session }) => {
      if (!session) throw new Forbidden();
      return suggestCommonNames(session, workspaceId, query ?? '', page);
    },
  }),
);
