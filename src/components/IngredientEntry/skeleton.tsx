import PageHeader from '../PageHeader';
import PageNav from '../PageNav';
import Skeleton from '../Skeleton';
import './index.scss';
import './formal-name.scss';

// The entry page's own frame with bars in place of the text: the formal name's eyebrow over the
// heading and its action, the menu beside, the sections beneath. Both entry pages' skeletons draw it,
// so a wait keeps every box where the page puts it.
export const EntrySkeleton = () => (
  <article className="ingredient-entry ingredient-entry--with-nav">
    <header className="ingredient-entry__head">
      <div className="back-bar ingredient-entry__bar">
        <Skeleton shape="line" quiet />
      </div>
      <div className="ingredient-entry__naming">
        <dl className="ingredient-entry__formal">
          <div className="ingredient-entry__pending-formal">
            <dd>
              <span className="eyebrow ingredient-entry__pending-eyebrow">
                <Skeleton shape="line" quiet />
              </span>
            </dd>
          </div>
        </dl>
        <PageHeader
          pendingTitle
          action={
            <span className="ingredient-entry__pending-action">
              <Skeleton shape="block" quiet />
            </span>
          }
        />
      </div>
      <div className="badges">
        <span className="ingredient-entry__pending-badge">
          <Skeleton shape="line" quiet />
        </span>
      </div>
    </header>
    <PageNav label="On This Page" entries={[]} pending />
    <div className="ingredient-entry__body">
      <section className="page-frame__section">
        <Skeleton shape="line" count={3} quiet />
      </section>
      <section className="page-frame__section">
        <Skeleton shape="line" count={3} quiet />
      </section>
    </div>
  </article>
);
