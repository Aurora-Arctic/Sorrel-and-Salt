import type { ReactElement } from 'react';
import { NO_MATCH_HINT } from '../../lib/text';
import { buildSearchSentence } from '../IngredientSearch/sentence';
import type { EmptyGrimoireProps } from './types';

// What a grimoire tab draws with no card to show (M10.11), as one of two status regions,
// named so a test or a screen reader tells them apart, as the coven's cards do (M9.11):
//   - No Spells, or No Drafts on the Drafts tab: the tab holds nothing yet.
//   - No Matches: a filter is in force and matched nothing. The search sentence above
//     already says so and names the filter, so this says only what to do.
// Which state is the search sentence's own test, `hasFilter`, so the two never disagree.
// No first add yet: the spell builder is M10.12's. claude-docs/components/grimoire-list.md.

const EmptyGrimoire = ({ status, filter }: EmptyGrimoireProps): ReactElement => {
  const { hasFilter } = buildSearchSentence({ filter, total: 0 });
  if (!hasFilter) {
    const name = status === 'draft' ? 'No Drafts' : 'No Spells';
    return (
      <output aria-label={name} className="grimoire-list__empty">
        {status === 'draft'
          ? 'There are no drafts here yet.'
          : 'There are no complete spells here yet.'}
      </output>
    );
  }
  return (
    <output aria-label="No Matches" className="grimoire-list__no-match">
      {NO_MATCH_HINT}
    </output>
  );
};

export default EmptyGrimoire;
