import type { ReactElement } from 'react';
import { ListBodySkeleton } from '../ListFrame/skeleton';

/** The compendium table's rows with nothing in them yet: its headings over placeholder rows. */
export const CompendiumListBodySkeleton = (): ReactElement => (
  <ListBodySkeleton
    label="Compendium"
    rowKind="compendium"
    headings={[
      'Name',
      'Formal Name',
      'Classification',
      'Form',
      'Categories',
      'Sourcing Score',
      'Edit',
    ]}
    actions={['Edit']}
  />
);
