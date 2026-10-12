import { builder } from '../../../graphql/builder';
import { suggestionConnection } from '../../../graphql/context-helpers';
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

suggestionConnection('commonNameSuggestions', CommonNameSuggestionRef, suggestCommonNames);
