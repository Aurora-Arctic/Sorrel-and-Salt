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
import PageNav from '@/components/PageNav';
import Skeleton from '@/components/Skeleton';

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

// A spell's page: the recipe's own frame, with the back bar, the title, the lead, the menu and
// the columns (the steps, and the side column's list) as bars.
export const SpellRecipeSkeleton = () => (
  <article className="spell-recipe spell-recipe--with-aside spell-recipe--with-nav spell-recipe--pending">
    <header className="spell-recipe__head">
      <div className="back-bar spell-recipe__bar">
        <Skeleton shape="line" quiet />
      </div>
      <div className="meta last-edit">
        <Skeleton shape="line" quiet />
      </div>
      <PageHeader
        pendingTitle
        action={
          <span className="spell-recipe__pending-action">
            <Skeleton shape="block" quiet />
          </span>
        }
      />
    </header>
    <div className="spell-recipe__lead">
      <p className="spell-recipe__intent">
        <Skeleton shape="line" quiet />
      </p>
      <ul aria-label="Categories" className="spell-recipe__pending-chips">
        <li>
          <Skeleton shape="block" quiet />
        </li>
      </ul>
    </div>
    <PageNav label="On This Page" entries={[]} pending={3} />
    <div className="spell-recipe__columns">
      <div className="spell-recipe__main">
        <div className="spell-recipe__rest">
          <div className="spell-recipe__facts-box">
            <Skeleton shape="block" quiet />
          </div>
          <p className="meta">
            <Skeleton shape="line" quiet />
          </p>
        </div>
        <aside className="spell-recipe__aside" aria-hidden>
          <Skeleton shape="block" quiet />
        </aside>
      </div>
    </div>
  </article>
);
