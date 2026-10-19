import type { ReactElement } from 'react';
import type { SkeletonHead, SkeletonProps, SkeletonShape } from './types';
import './index.scss';

// The one skeleton every region wait uses (M12.33): placeholder shapes drawn
// as the layout they stand in for, so the page does not snap from one to the
// next. The shapes are for the eye alone, `aria-hidden`; a screen reader
// hears the `<output>`, a status by its tag, saying "Loading", the only
// announcement. Shown at once, never held back by `$loading-delay`.
// claude-docs/components/skeleton.md
const DEFAULT_COUNT: Record<SkeletonShape, number> = {
  table: 6,
  cards: 6,
  form: 4,
  page: 3,
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
const PageHead = ({ head, loose }: { head: SkeletonHead; loose?: boolean }): ReactElement => (
  <div className={loose ? 'skeleton__intro skeleton__intro--loose' : 'skeleton__intro'}>
    {head === 'eyebrow' && <span className="skeleton__eyebrow" />}
    <span className="skeleton__title" />
    {head !== 'title' && (
      <div className="skeleton__lede">
        <span />
        <span />
      </div>
    )}
  </div>
);

// An ingredient's page below its head, as IngredientEntry lays it: Details,
// its text beside a side column of headed lists, then Forms with a form's
// section laid the same way. Bare bars on the page, with no card surface.
const EntryPart = (): ReactElement => (
  <div className="skeleton__entry-section">
    <span className="skeleton__heading" />
    <div className="skeleton__entry-text">
      <span />
      <span />
      <span />
    </div>
    <div className="skeleton__entry-side">
      {Array.from({ length: 4 }, (_, at) => (
        <div key={at} className="skeleton__entry-block">
          <span />
          <span />
        </div>
      ))}
    </div>
  </div>
);

const EntrySections = (): ReactElement => (
  <>
    <EntryPart />
    <div className="skeleton__entry-forms">
      <span className="skeleton__heading" />
      <EntryPart />
    </div>
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
  count,
}: SkeletonProps): ReactElement => {
  const many = count ?? DEFAULT_COUNT[shape];
  const listed = shape === 'table' || shape === 'cards';
  return (
    <div className={`skeleton skeleton--${shape}`}>
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
        {shape === 'line' && <span className="skeleton__line" />}
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
            <PageHead head={head} />
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
