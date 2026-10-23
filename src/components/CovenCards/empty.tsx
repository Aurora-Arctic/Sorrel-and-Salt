import type { ReactElement } from 'react';
import { PendingLink } from '../../lib/navigation';
import { NO_MATCH_HINT } from '../../lib/text';
import { siteLinkTarget } from '../AppShell/site-target';
import { PUBLIC_COMPENDIUM_PATH, compendiumHref } from '../CompendiumList/href';
import { buildSearchSentence } from '../IngredientSearch/sentence';
import FirstAdd from './first-add';
import type { EmptyCupboardProps } from './types';
import './index.scss';

// What a coven's Ingredients list draws with no card to show (M9.11), as one of two status
// regions, named so a test or a screen reader tells them apart by which is there:
//   - No Ingredients: the cupboard holds nothing, and a member who may add is offered the
//     first add, the shell's own dialog. A viewer, who cannot add, is told which roles can,
//     so the empty cupboard reads as nobody having filled it yet, not as a fault (MB.121).
//   - No Matches: a filter is in force and matched nothing. The search sentence above the list
//     already names each filter and says nothing matched ("No ingredients, matching
//     Knitbone"), so this says only what to do: change or clear the filter, with the filter
//     row's own clears (Clear Name, Clear All) rather than another. A search that found nothing
//     in the cupboard is handed on to the Compendium, which may hold it.
// Which state is the search sentence's own test, `hasFilter`, so the two never disagree.
// claude-docs/components/coven-cards.md, "The empty and no-match states".

const EmptyCupboard = ({ covenSlug, filter, canAdd }: EmptyCupboardProps): ReactElement => {
  // Normalised as the filter row normalises it for the sentence (CompendiumList/filter.tsx).
  const { hasFilter } = buildSearchSentence({
    filter: {
      ...filter,
      toxic: filter.toxic || null,
      source: filter.source || null,
      inStock: filter.inStock ?? false,
      lowStockOnly: filter.lowStockOnly ?? false,
    },
    total: 0,
  });
  if (!hasFilter) {
    return (
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- holds a paragraph and a button, which <output> may not
      <div role="status" aria-label="No Ingredients" className="coven-cards__empty">
        <p>There are no ingredients here yet.</p>
        {canAdd ? (
          <FirstAdd covenSlug={covenSlug} />
        ) : (
          <p>A member or owner of this coven can add them.</p>
        )}
      </div>
    );
  }
  return (
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- holds a paragraph and a link, which <output> may not
    <div role="status" aria-label="No Matches" className="coven-cards__no-match">
      <p>{NO_MATCH_HINT}</p>
      {filter.query && (
        <PendingLink
          href={compendiumHref({ query: filter.query }, undefined, PUBLIC_COMPENDIUM_PATH)}
          navigationTarget={siteLinkTarget(PUBLIC_COMPENDIUM_PATH)}
          className="btn btn--solid"
        >
          Search the Compendium
        </PendingLink>
      )}
    </div>
  );
};

export default EmptyCupboard;
