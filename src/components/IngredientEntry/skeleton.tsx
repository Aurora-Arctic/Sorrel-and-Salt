import PageHeader from '../PageHeader';
import PageNav from '../PageNav';
import Skeleton from '../Skeleton';
import './index.scss';
import './formal-name.scss';

// The entry page's own frame with bars in place of the text: the formal name's eyebrow over the
// heading and its action, the menu beside, the sections beneath. Both entry pages' skeletons draw it,
// so a wait keeps every box where the page puts it. A coven's page has more icons beside the name,
// a last-edit line above it and the stock shelf first.
export const EntrySkeleton = ({ coven = false }: { coven?: boolean }) => (
  <article className="ingredient-entry ingredient-entry--with-nav ingredient-entry--pending">
    <header className="ingredient-entry__head">
      <div className="back-bar ingredient-entry__bar">
        <Skeleton shape="line" quiet />
      </div>
      {coven && <Skeleton shape="line" quiet />}
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
          lead={coven && <span className="ingredient-entry__pending-held" />}
          action={
            <span className="ingredient-entry__pending-action" data-icons={coven ? 3 : 1}>
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
    <PageNav label="On This Page" entries={[]} pending={coven ? 8 : true} />
    <div className="ingredient-entry__body">
      {coven && (
        <section className="ingredient-entry__section">
          <div className="ingredient-entry__stock-panel">
            <div className="ingredient-entry__stock-head">
              <h2 aria-hidden="true" className="ingredient-entry__pending-heading">
                <Skeleton shape="line" quiet />
              </h2>
            </div>
            <ul aria-label="Stock" className="ingredient-entry__pending-shelf">
              <li>
                <Skeleton shape="block" quiet />
              </li>
            </ul>
          </div>
        </section>
      )}
      <section className="page-frame__section">
        <Skeleton shape="line" count={3} quiet />
      </section>
      <section className="page-frame__section">
        <Skeleton shape="line" count={3} quiet />
      </section>
    </div>
  </article>
);
