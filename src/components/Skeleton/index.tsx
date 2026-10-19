import type { ReactElement } from 'react';
import type { SkeletonProps, SkeletonShape } from './types';
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
  line: 1,
};

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

const Skeleton = ({ shape, filter = false, count }: SkeletonProps): ReactElement => {
  const many = count ?? DEFAULT_COUNT[shape];
  const listed = shape === 'table' || shape === 'cards';
  return (
    <div className={`skeleton skeleton--${shape}`}>
      <output className="visually-hidden">Loading</output>
      <div className="skeleton__shapes" aria-hidden="true">
        {listed && filter && (
          <div className="skeleton__filter">
            <span className="skeleton__field" />
            <span className="skeleton__field skeleton__field--short" />
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
          <>
            <span className="skeleton__title" />
            <span className="skeleton__lede" />
            <div className="skeleton__blocks">
              {Array.from({ length: many }, (_, block) => (
                <div key={block} className="skeleton__block">
                  <span />
                  <span />
                  <span />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Skeleton;
