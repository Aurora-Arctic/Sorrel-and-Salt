import type { ReactElement } from 'react';
import { PendingLink } from '../../lib/navigation';
import { emptyList, NO_MATCH_HINT } from '../../lib/text';
import EmptyState from '../EmptyState';
import { buildSearchSentence } from '../IngredientSearch/sentence';
import type { EmptyGrimoireProps } from './types';

// What a grimoire tab draws with no card, as a named status region: No Spells (No Drafts on the Drafts tab) or No
// Matches. An empty tab tells an observer, who has no New Spell, which roles can write one
// (claude-docs/components/grimoire-list.md).

const EmptyGrimoire = ({ status, filter, canCreate, path }: EmptyGrimoireProps): ReactElement => {
  const { hasFilter } = buildSearchSentence({ filter, total: 0 });
  if (!hasFilter) {
    const drafts = status === 'draft';
    return (
      <EmptyState
        label={drafts ? 'No Drafts' : 'No Spells'}
        detail={canCreate ? undefined : 'A practitioner or steward of this coven can write them.'}
      >
        {emptyList(drafts ? 'drafts' : 'complete spells')}
      </EmptyState>
    );
  }
  return (
    <EmptyState
      label="No Matches"
      size="compact"
      action={
        <PendingLink href={path} className="btn btn--quiet">
          Clear Filters
        </PendingLink>
      }
    >
      {NO_MATCH_HINT}
    </EmptyState>
  );
};

export default EmptyGrimoire;
