'use client';

import { SearchListSkeleton, SearchRowSkeleton } from '@/components/IngredientSearch/skeleton';
import { ListBodySkeleton } from '@/components/ListFrame/skeleton';

/** A Grimoire tab's filter row and spell cards, compact as the coven lists open. */
export const GrimoirePanelSkeleton = ({ drafts }: { drafts?: boolean }) => (
  <div data-density="compact">
    <SearchListSkeleton
      row={<SearchRowSkeleton label="Filter the Grimoire" className="grimoire-list__row" density />}
    >
      <ListBodySkeleton
        label={drafts ? 'Drafts' : 'Spells'}
        card="spell"
        draft={drafts}
        density="compact"
      />
    </SearchListSkeleton>
  </div>
);
