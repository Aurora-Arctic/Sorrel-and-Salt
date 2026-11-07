import { EntrySkeleton } from '@/components/IngredientEntry/skeleton';
import { ListSkeleton } from '@/components/ListFrame/skeleton';
import PageHeader from '@/components/PageHeader';
import PageNav from '@/components/PageNav';
import PageWithNav from '@/components/PageWithNav';
import Skeleton from '@/components/Skeleton';

// The coven's name and the viewer's role are not known yet, so the head is a bar; the menu and sections
// are the ones every member sees.
export const CovenHomeSkeleton = () => (
  <PageWithNav as="div">
    <PageHeader
      eyebrow="Coven"
      pendingTitle={2}
      lede={
        <span className="skeleton-lede">
          <Skeleton shape="line" count={3} quiet />
        </span>
      }
    />
    <PageNav label="On This Page" entries={[]} pending={3} />
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
    <ListSkeleton filter="Filter Ingredients" label="Ingredients" density="compact" />
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
