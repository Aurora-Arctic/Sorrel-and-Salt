import { BackChevron } from '../IngredientEntry/back-chevron';
import PageHeader from '../PageHeader';
import PageNav from '../PageNav';
import Skeleton from '../Skeleton';
import SkeletonText, { SkeletonWords } from '../Skeleton/text';
import { recipeMenu } from './sections';
import '../LinkHint/index.scss';
import './index.scss';
import '../SpellBuilder/panels.scss';
import '../SpellWorkings/index.scss';

// A spell's page: the recipe's own frame, with its fixed words drawn (the back link, the menu, the
// side column's and Workings' headings) and bars for the spell's own text. The action is sized for
// the four buttons a complete, shared spell shows its author.
export const SpellRecipeSkeleton = () => (
  <article className="spell-recipe spell-recipe--with-aside spell-recipe--with-nav spell-recipe--pending">
    <header className="spell-recipe__head">
      <div className="back-bar spell-recipe__bar">
        <span className="back-link" aria-hidden="true">
          <BackChevron />
          Back to Grimoire <span className="link-hint" />
        </span>
      </div>
      <p className="meta last-edit">
        <SkeletonWords count={3} />
      </p>
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
    <PageNav
      label="On This Page"
      entries={recipeMenu({ steps: true, aside: true, workings: true })}
      pending
    />
    <div className="spell-recipe__columns">
      <div className="spell-recipe__main">
        <div className="spell-recipe__rest">
          <div className="spell-recipe__facts-box">
            <Skeleton shape="block" quiet />
          </div>
          <div className="spell-recipe__steps-section">
            <Skeleton shape="line" count={3} quiet />
          </div>
        </div>
        <aside className="spell-recipe__aside" aria-hidden="true">
          <section className="comparison-panel">
            <h2>
              <SkeletonText>Category Match</SkeletonText>
            </h2>
            <Skeleton shape="line" quiet />
          </section>
          <section className="spell-inventory">
            <h2>
              <SkeletonText>In the Cupboard</SkeletonText>
            </h2>
            <Skeleton shape="line" quiet />
          </section>
        </aside>
        <section className="spell-workings page-frame__section" aria-hidden="true">
          <div className="spell-workings__title">
            <h2>
              <SkeletonText>Workings</SkeletonText>
            </h2>
          </div>
          <Skeleton shape="line" quiet />
        </section>
      </div>
    </div>
  </article>
);
