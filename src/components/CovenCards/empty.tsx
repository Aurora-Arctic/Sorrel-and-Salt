import type { Route } from 'next';
import type { ReactElement } from 'react';
import { PendingLink } from '../../lib/navigation';
import { publicGuidePath } from '../../lib/help-paths';
import { NO_MATCH_HINT } from '../../lib/text';
import { siteLinkTarget } from '../AppShell/site-target';
import { PUBLIC_COMPENDIUM_PATH, compendiumHref } from '../CompendiumList/href';
import { buildSearchSentence } from '../IngredientSearch/sentence';
import FirstAdd from './first-add';
import type { EmptyCupboardProps } from './types';
import './index.scss';

// What a coven's Ingredients list draws with no card, as a status region: No Ingredients (an empty
// cupboard) or No Matches (a filter matched nothing; `hasFilter` is the search sentence's own test)
// (claude-docs/components/coven-cards.md, "The empty and no-match states").

// The Ingredients guide's slug is its title's (src/db/seed/help-content/articles.ts).
const INGREDIENTS_GUIDE = publicGuidePath('ingredients') as Route;

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
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- holds a paragraph and a button, which <output> may not
      <div role="status" aria-label="No Ingredients" className="coven-cards__empty">
        <p>There are no ingredients here yet.</p>
        {canAdd ? (
          <FirstAdd covenSlug={covenSlug} />
        ) : (
          <p>A practitioner or steward of this coven can add them.</p>
        )}
        <PendingLink href={INGREDIENTS_GUIDE} navigationTarget={siteLinkTarget('/help')}>
          Learn More
        </PendingLink>
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
