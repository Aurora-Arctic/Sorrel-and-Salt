import type { ReactElement } from 'react';
import { PendingLink } from '../../lib/navigation';
import { siteLinkTarget } from '../AppShell/site-target';
import { emptyText, filterParts } from '../CompendiumList';
import { PUBLIC_COMPENDIUM_PATH, compendiumHref } from '../CompendiumList/href';
import FirstAdd from './first-add';
import type { EmptyCupboardProps } from './types';

// What a coven's Ingredients list draws with no card to show (M9.11), as one of two status
// regions, named so a test or a screen reader tells them apart by which is there:
//   - No Ingredients: the cupboard holds nothing, and a member who may add is offered the
//     first add, the shell's own dialog. A viewer reads the sentence alone.
//   - No Matches: a filter is in force and matched nothing. The sentence names each filter and
//     says to change or clear it, pointing at the filter row's own clears (Clear Name, Clear
//     All) rather than drawing another. A search that found nothing in the cupboard is handed
//     on to the Compendium, which may hold it (the cupboard plan's decision 3).
// claude-docs/components/coven-cards.md, "The empty and no-match states".

const EmptyCupboard = ({
  covenSlug,
  filter,
  categories,
  facets,
  canAdd,
}: EmptyCupboardProps): ReactElement => {
  const sentence = emptyText(
    filter,
    categories,
    facets,
    'There are no ingredients here yet.',
    'ingredients',
  );
  if (filterParts(filter, categories, facets).length === 0) {
    return (
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- holds a paragraph and a button, which <output> may not
      <div role="status" aria-label="No Ingredients">
        <p>{sentence}</p>
        {canAdd && <FirstAdd covenSlug={covenSlug} />}
      </div>
    );
  }
  return (
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- holds a paragraph and a link, which <output> may not
    <div role="status" aria-label="No Matches">
      <p>{sentence}</p>
      {filter.query && (
        <p>
          <PendingLink
            href={compendiumHref({ query: filter.query }, undefined, PUBLIC_COMPENDIUM_PATH)}
            navigationTarget={siteLinkTarget(PUBLIC_COMPENDIUM_PATH)}
          >
            Search the Compendium
          </PendingLink>
        </p>
      )}
    </div>
  );
};

export default EmptyCupboard;
