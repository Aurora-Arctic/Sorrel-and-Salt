import type { ReactElement } from 'react';
import { SearchListSkeleton, SearchRowSkeleton } from '../IngredientSearch/skeleton';
import { ListBodySkeleton } from '../ListFrame/skeleton';

/** The compendium table's rows with nothing in them yet: its headings over placeholder rows. */
export const CompendiumListBodySkeleton = (): ReactElement => (
  <ListBodySkeleton
    label="Compendium"
    rowKind="compendium"
    tableClassName="data-table--nowrap"
    sortable={['Name', 'Sourcing Score']}
    headings={[
      'Name',
      'Formal Name',
      'Classification',
      'Form',
      'Categories',
      'Sourcing Score',
      'Updated',
      'Edit',
    ]}
    actions={['Edit']}
    hidden={['Edit']}
  />
);

/**
 * The compendium list's filter row and count line with nothing in them yet: the search box, the
 * Filters button, and for a coven the density switch, over a line as tall as the count sentence.
 */
export const CompendiumFilterSkeleton = ({ coven = false }: { coven?: boolean }): ReactElement => (
  <SearchRowSkeleton
    label={coven ? 'Filter Ingredients' : 'Filter the Compendium'}
    className="compendium-list__row"
    density={coven}
  />
);

/** The curator's compendium list with nothing in it yet: its filter row over its table headings. */
export const CompendiumListSkeleton = (): ReactElement => (
  <SearchListSkeleton row={<CompendiumFilterSkeleton />}>
    <CompendiumListBodySkeleton />
  </SearchListSkeleton>
);
