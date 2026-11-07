import type { ReactElement } from 'react';
import { PendingLink } from '../../lib/navigation';
import { emptyList, NO_MATCH_HINT } from '../../lib/text';
import {
  PUBLIC_COMPENDIUM_PATH,
  compendiumHref,
  covenIngredientsPath,
} from '../CompendiumList/href';
import EmptyState from '../EmptyState';
import { buildSearchSentence } from '../IngredientSearch/sentence';
import FirstAdd from './first-add';
import type { EmptyCupboardProps } from './types';

// What a coven's Ingredients list draws with no card, as a status region: No Ingredients (an empty
// cupboard) or No Matches (a filter matched nothing; `hasFilter` is the search sentence's own test)
// (claude-docs/components/coven-cards.md, "The empty and no-match states").

const EmptyCupboard = ({ covenSlug, filter, canAdd }: EmptyCupboardProps): ReactElement => {
  // Normalised as the filter row normalises it for the sentence (CompendiumList/filter.tsx).
  const { hasFilter } = buildSearchSentence({
    filter: {
      ...filter,
      toxic: filter.toxic || null,
      reviewed: null,
      source: filter.source || null,
      inStock: filter.inStock ?? false,
      lowStockOnly: filter.lowStockOnly ?? false,
    },
    total: 0,
  });
  if (!hasFilter) {
    return (
      <EmptyState
        label="No Ingredients"
        action={canAdd ? <FirstAdd covenSlug={covenSlug} /> : undefined}
        detail={canAdd ? undefined : 'A practitioner or steward of this coven can add them.'}
      >
        {emptyList('ingredients')}
      </EmptyState>
    );
  }
  return (
    <EmptyState
      label="No Matches"
      size="compact"
      action={
        <>
          <PendingLink href={covenIngredientsPath(covenSlug)} className="btn btn--quiet">
            Clear Filters
          </PendingLink>
          {filter.query && (
            <PendingLink
              href={compendiumHref({ query: filter.query }, undefined, PUBLIC_COMPENDIUM_PATH)}
              className="btn btn--quiet"
            >
              Search the Compendium
            </PendingLink>
          )}
        </>
      }
    >
      {NO_MATCH_HINT}
    </EmptyState>
  );
};

export default EmptyCupboard;
