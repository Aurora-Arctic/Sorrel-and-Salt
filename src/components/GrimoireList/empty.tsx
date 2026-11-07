import type { Route } from 'next';
import type { ReactElement } from 'react';
import { publicGuidePath } from '../../lib/help-paths';
import { PendingLink } from '../../lib/navigation';
import { NO_MATCH_HINT } from '../../lib/text';
import { siteLinkTarget } from '../AppShell/site-target';
import { buildSearchSentence } from '../IngredientSearch/sentence';
import type { EmptyGrimoireProps } from './types';

// What a grimoire tab draws with no card, as a named status region: No Spells (No Drafts on the Drafts tab) or No
// Matches. An empty tab tells an observer, who has no New Spell, which roles can write one, and links the Grimoire
// guide (claude-docs/components/grimoire-list.md).

// The Grimoire guide's slug is its title's (src/db/seed/help-content/articles.ts).
const GRIMOIRE_GUIDE = publicGuidePath('grimoire') as Route;

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
        {!canCreate && <p>A practitioner or steward of this coven can write them.</p>}
        <PendingLink href={GRIMOIRE_GUIDE} navigationTarget={siteLinkTarget('/help')}>
          Learn More
        </PendingLink>
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
