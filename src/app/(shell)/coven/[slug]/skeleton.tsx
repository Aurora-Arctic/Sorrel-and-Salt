'use client';

import { useCovenFactsOfDestination } from '@/components/CovenFacts';
import CovenHome from '@/components/CovenHome';
import { covenSlugOf } from '@/lib/coven-path';
import { useNavigationState } from '@/lib/navigation';
import { EntrySkeleton } from '@/components/IngredientEntry/skeleton';
import { SearchListSkeleton, SearchRowSkeleton } from '@/components/IngredientSearch/skeleton';
import { ListBodySkeleton } from '@/components/ListFrame/skeleton';
import ActionFace from '@/components/ActionFace';
import PageHeader from '@/components/PageHeader';
export { SpellRecipeSkeleton } from '@/components/SpellRecipe/skeleton';

// The coven's home, drawn from the page's own words. Moving within the coven, its name and the viewer's
// role are known, so the page is drawn whole; otherwise the title and lede are bars and the menu and
// sections are a steward's, the longest a coven shows.
export const CovenHomeSkeleton = () => {
  const facts = useCovenFactsOfDestination();
  const { href } = useNavigationState();
  const slug = facts?.slug ?? covenSlugOf(href?.split(/[?#]/)[0] ?? '') ?? '';
  return (
    <CovenHome
      pending
      slug={slug}
      name={facts?.name}
      demo={facts?.demo}
      role={facts?.role ?? 'owner'}
      access={
        facts?.access ?? { canDelete: true, canReadMembers: true, canInvite: true, canRename: true }
      }
    />
  );
};

// The coven's Ingredients: the page's head, then its filter row and compact cards.
export const CovenIngredientsSkeleton = () => (
  <div>
    <PageHeader title="Ingredients" action={<ActionFace>Add Ingredient</ActionFace>} />
    <div data-density="compact">
      <SearchListSkeleton
        row={
          <SearchRowSkeleton label="Filter Ingredients" className="compendium-list__row" density />
        }
      >
        <ListBodySkeleton label="Ingredients" density="compact" />
      </SearchListSkeleton>
    </div>
  </div>
);

// An ingredient's page: the entry's own frame, with a name not yet known.
export const CovenEntrySkeleton = () => <EntrySkeleton coven />;
