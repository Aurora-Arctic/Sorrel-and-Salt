import type { ReactElement } from 'react';
import { NO_MATCH_HINT } from '../../lib/text';
import { buildSearchSentence } from '../IngredientSearch/sentence';
import type { EmptyGrimoireProps } from './types';

// What a grimoire tab draws with no card, as a named status region: No Spells (No Drafts on the Drafts
// tab) or No Matches, where a filter matched nothing. `hasFilter` is the search sentence's own test.
// There is no first add: New Spell at the heading opens the builder, and an empty Spells tab tells a
// viewer, who has no New Spell, which roles can write one (claude-docs/components/grimoire-list.md).

const EmptyGrimoire = ({ status, filter, canCreate }: EmptyGrimoireProps): ReactElement => {
  const { hasFilter } = buildSearchSentence({ filter, total: 0 });
  if (!hasFilter) {
    const drafts = status === 'draft';
    return (
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- holds paragraphs, which <output> may not
      <div
        role="status"
        aria-label={drafts ? 'No Drafts' : 'No Spells'}
        className="grimoire-list__empty"
      >
        <p>{drafts ? 'There are no drafts here yet.' : 'There are no complete spells here yet.'}</p>
        {!drafts && !canCreate && <p>A member or owner of this coven can write them.</p>}
      </div>
    );
  }
  return (
    <output aria-label="No Matches" className="grimoire-list__no-match">
      {NO_MATCH_HINT}
    </output>
  );
};

export default EmptyGrimoire;
