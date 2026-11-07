import { SearchListSkeleton, SearchRowSkeleton } from '@/components/IngredientSearch/skeleton';
import { ListBodySkeleton } from '@/components/ListFrame/skeleton';
import PageHeader from '@/components/PageHeader';
import PageNav from '@/components/PageNav';
import PageWithNav from '@/components/PageWithNav';
import Skeleton from '@/components/Skeleton';

// The coven's name and the viewer's role are not known yet, so the head is a bar; the menu and sections
// are the ones every member sees.
export const CovenHomeSkeleton = () => (
  <PageWithNav as="div">
    <PageHeader eyebrow="Coven" pendingTitle />
    <PageNav
      label="On This Page"
      entries={[
        { href: '#coven-contents', label: 'Contents' },
        { href: '#coven-membership', label: 'Your Membership' },
      ]}
    />
    <section className="page-frame__section">
      <Skeleton shape="line" count={4} quiet />
    </section>
    <section className="page-frame__section">
      <Skeleton shape="block" quiet />
    </section>
  </PageWithNav>
);

// The coven's Ingredients: the page's head, then its filter row and compact cards.
export const CovenIngredientsSkeleton = () => (
  <div>
    <PageHeader title="Ingredients" />
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

// An ingredient's page: the back bar and a name not yet known, then its menu and sections.
export const CovenEntrySkeleton = () => (
  <div>
    <div className="back-bar">
      <Skeleton shape="line" quiet />
    </div>
    <PageHeader pendingTitle />
    <PageWithNav as="div">
      <PageNav
        label="On This Page"
        entries={[
          { href: '#stock', label: 'Stock' },
          { href: '#details', label: 'Details' },
          { href: '#forms', label: 'Forms' },
          { href: '#references', label: 'References' },
        ]}
      />
      <section className="page-frame__section">
        <Skeleton shape="line" count={3} quiet />
        <Skeleton shape="line" count={3} quiet />
      </section>
    </PageWithNav>
  </div>
);

// A spell's page: the recipe's own frame, with the back bar, the title and its columns as bars.
export const SpellRecipeSkeleton = () => (
  <article className="spell-recipe spell-recipe--with-aside">
    <header className="spell-recipe__head">
      <div className="back-bar spell-recipe__bar">
        <Skeleton shape="line" quiet />
      </div>
      <PageHeader pendingTitle />
    </header>
    <div className="spell-recipe__columns">
      <div className="spell-recipe__main">
        <Skeleton shape="line" count={4} quiet />
        <Skeleton shape="block" quiet />
      </div>
    </div>
  </article>
);
