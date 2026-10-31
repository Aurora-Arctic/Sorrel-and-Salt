import type { ReactElement } from 'react';
import type { SkeletonHead, SkeletonProps, SkeletonShape } from './types';
import './index.scss';

// The one skeleton every region wait uses, shaped as the layout it stands in for. The shapes are
// `aria-hidden`; the `<output>` saying "Loading" is the only announcement. Shown at once, never
// held by `$loading-delay` (claude-docs/components/skeleton.md).
const DEFAULT_COUNT: Record<SkeletonShape, number> = {
  table: 6,
  cards: 6,
  form: 4,
  page: 3,
  sections: 3,
  contents: 2,
  line: 1,
};

// The admin index's two sections: Compendium's five pages and People's one.
const CONTENTS_ENTRIES = [5, 1];

const Bars = ({ of: length, className }: { of: number; className: string }): ReactElement => (
  <>
    {Array.from({ length }, (_, at) => (
      <div key={at} className={className}>
        <span />
        <span />
        <span />
      </div>
    ))}
  </>
);

// A page's head at the size of the real one, so what is under it does not
// jump on arrival: an eyebrow bar where the page has an eyebrow, the title,
// and a lede that wraps to two lines unless the page has none.
const PageHead = ({
  head,
  loose,
  back,
}: {
  head: SkeletonHead;
  loose?: boolean;
  back?: boolean;
}): ReactElement => (
  <div
    className={
      loose
        ? 'skeleton__intro skeleton__intro--loose'
        : back
          ? 'skeleton__intro skeleton__intro--entry'
          : 'skeleton__intro'
    }
  >
    {back && <span className="skeleton__entry-bar" />}
    {head === 'eyebrow' && <span className="skeleton__eyebrow" />}
    <span className="skeleton__title" />
    {head !== 'title' && (
      <div className="skeleton__lede">
        <span />
        {!back && <span />}
      </div>
    )}
  </div>
);

// An ingredient's page below its head, as IngredientEntry lays it: Stock, Details, its side
// column of headed lists beside them, then Forms with a form's section laid the same way. Bare
// bars on the page, with no card surface.
const EntrySide = (): ReactElement => (
  <div className="skeleton__entry-side">
    {Array.from({ length: 4 }, (_, at) => (
      <div key={at} className="skeleton__entry-block">
        <span />
        <span />
      </div>
    ))}
  </div>
);

// `details` is the page's Details section, whose side column stands apart in the body
// (`EntrySections`); a form's keeps its own inside.
const EntryPart = ({ details = false }: { details?: boolean }): ReactElement => (
  <div
    className={
      details ? 'skeleton__entry-section skeleton__entry-details' : 'skeleton__entry-section'
    }
  >
    <span className="skeleton__heading" />
    <div className="skeleton__entry-text">
      <span />
      <span />
      <span />
    </div>
    {!details && <EntrySide />}
  </div>
);

// The entry's Stock section as the page lays it: a heading, then a shelf of jars on a
// plank, each with its name and amount beneath. Three, the common case; the wait cannot
// know how many forms the entry has, nor whether the coven holds any.
const StockPart = (): ReactElement => (
  <div className="skeleton__entry-section">
    <span className="skeleton__heading" />
    <div className="skeleton__stock">
      {Array.from({ length: 3 }, (_, at) => (
        <div key={at} className="skeleton__jar">
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  </div>
);

// In the entry's body box, so Details' columns and the forms lay out as the page's do.
const EntrySections = (): ReactElement => (
  <div className="skeleton__entry-body">
    <StockPart />
    <EntryPart details />
    <EntrySide />
    <div className="skeleton__entry-forms">
      <span className="skeleton__heading" />
      <EntryPart />
    </div>
  </div>
);

// The coven home below its head, as the page lays it: Contents, a list of
// links each with its line beneath, then the membership and delete sections,
// each a heading and a button. Bare bars on the page, no card surface.
const CovenSections = (): ReactElement => (
  <>
    <div className="page-frame__section">
      <span className="skeleton__heading" />
      <div className="skeleton__list">
        {Array.from({ length: 2 }, (_, at) => (
          <div key={at} className="skeleton__entry">
            <span />
            <span />
          </div>
        ))}
      </div>
    </div>
    {[false, true].map((described) => (
      <div key={String(described)} className="page-frame__section">
        <span className="skeleton__heading" />
        {described && <span className="skeleton__line-bar" />}
        <span className="skeleton__button" />
      </div>
    ))}
  </>
);

// The account page below its title: four panels as the page draws them, each
// a heading and a line over a field and its button.
const AccountPanels = ({ count = 4 }: { count?: number }): ReactElement => (
  <>
    {Array.from({ length: count }, (_, at) => (
      <div key={at} className="page-frame__section panel">
        <div className="header">
          <span className="skeleton__heading" />
          <span className="skeleton__line-bar" />
        </div>
        <span className="skeleton__box" />
        <span className="skeleton__button" />
      </div>
    ))}
  </>
);

const Skeleton = ({
  shape,
  filter = false,
  title = false,
  action = false,
  tabs = false,
  menu = false,
  entry = false,
  head,
  density,
  count,
}: SkeletonProps): ReactElement => {
  const many = count ?? DEFAULT_COUNT[shape];
  const listed = shape === 'table' || shape === 'cards';
  return (
    <div className={`skeleton skeleton--${shape}`} data-density={density}>
      <output className="visually-hidden">Loading</output>
      <div className="skeleton__shapes" aria-hidden="true">
        {listed && title && (
          <div className="page-header skeleton__header">
            <span className="skeleton__title" />
            {tabs && <span className="skeleton__tabs" />}
            {action && <span className="skeleton__action" />}
          </div>
        )}
        {listed && filter && (
          <div className="skeleton__filter">
            <span className="skeleton__field" />
            <span
              className={
                shape === 'cards'
                  ? 'skeleton__field skeleton__field--button'
                  : 'skeleton__field skeleton__field--short'
              }
            />
          </div>
        )}
        {shape === 'cards' && filter && (
          <div className="skeleton__count">
            <span />
          </div>
        )}
        {shape === 'cards' && (
          <div className="skeleton__cards">
            <Bars of={many} className="skeleton__card" />
          </div>
        )}
        {shape === 'table' && (
          <div className="skeleton__table">
            <div className="skeleton__head">
              <span />
              <span />
              <span />
            </div>
            <Bars of={many} className="skeleton__row" />
          </div>
        )}
        {listed && (
          <div className="skeleton__pager">
            <span />
            <span />
          </div>
        )}
        {shape === 'form' && (
          <>
            {Array.from({ length: many }, (_, field) => (
              <div key={field} className="skeleton__form-field">
                <span className="skeleton__label" />
                <span className="skeleton__box" />
              </div>
            ))}
            <div className="skeleton__actions">
              <span />
              <span />
            </div>
          </>
        )}
        {shape === 'sections' && (
          // A tab of the account: the jump menu and the panels, the heading above being the tabbed page's own.
          <div className="page-with-nav page-with-nav--headless">
            <div className="page-nav skeleton__menu">
              <span />
              <span />
              <span />
              <span />
            </div>
            <AccountPanels count={many} />
          </div>
        )}
        {shape === 'line' &&
          Array.from({ length: many }, (_, line) => <span key={line} className="skeleton__line" />)}
        {shape === 'page' && (
          // The page's own grid when it has a menu (`.page-with-nav`), its
          // children in the page's order: head, menu, then the sections, so
          // the menu stands where the real one does at every width.
          <div
            className={
              menu
                ? entry
                  ? 'ingredient-entry ingredient-entry--with-nav'
                  : 'page-with-nav'
                : 'skeleton__plain'
            }
          >
            <PageHead head={head} back={entry} />
            {menu && (
              <div className="page-nav skeleton__menu">
                <span />
                <span />
                <span />
                <span />
              </div>
            )}
            {entry ? (
              <EntrySections />
            ) : menu ? (
              head === 'title' ? (
                <AccountPanels />
              ) : (
                <CovenSections />
              )
            ) : (
              Array.from({ length: many }, (_, block) => (
                <div key={block} className="skeleton__block">
                  <span />
                  <span />
                  <span />
                </div>
              ))
            )}
          </div>
        )}
        {shape === 'contents' && (
          // The admin index: a heading and a line, then titled lists of
          // links each with its one line beneath, as `AdminContents` lays them.
          <div className="skeleton__plain">
            <PageHead head={head} loose />
            {CONTENTS_ENTRIES.map((entries, section) => (
              <div key={section} className="skeleton__section">
                <span className="skeleton__label" />
                <div className="skeleton__list">
                  {Array.from({ length: entries }, (_, entry) => (
                    <div key={entry} className="skeleton__entry">
                      <span />
                      <span />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Skeleton;
