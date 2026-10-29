import type { ReactElement } from 'react';
import { NO_MATCH_HINT } from '../../lib/text';
import { buildSearchSentence } from '../IngredientSearch/sentence';
import type { EmptyGrimoireProps } from './types';

// What a grimoire tab draws with no card, as a named status region: No Spells (No Drafts on the Drafts
// tab) or No Matches, where a filter matched nothing. `hasFilter` is the search sentence's own test.
// There is no first add: New Spell at the heading opens the builder (claude-docs/components/grimoire-list.md).

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
