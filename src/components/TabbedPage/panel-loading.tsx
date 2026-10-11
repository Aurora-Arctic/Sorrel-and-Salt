import type { ReactElement } from 'react';
import type { TabPanelLoadingProps } from './types';

// What a tab's panel shows while the tab just pressed is on its way
// (MB.115): the panel renders it in place of the old tab's content, beneath
// the page's heading and tabs, which stay where they are. A skeleton of the
// list it stands in for, on the owner's call, so the page does not snap from
// one tab to the next: the filter row where the tab has one, a table's
// heading and six rows, and the pager, as placeholder shapes with a soft
// shimmer. At a phone's width the rows are cards, as the stacked table's are.
// The shapes are drawn for the eye alone, `aria-hidden`; the one thing a
// screen reader hears is the `<output>`, a status by its tag, saying the tab
// is loading, which the shapes already say to the eye.

const ROWS = 6;

const TabPanelLoading = ({ filter = false }: TabPanelLoadingProps): ReactElement => (
  <div className="tab-skeleton">
    <output className="visually-hidden">Loading</output>
    <div className="tab-skeleton__shapes" aria-hidden="true">
      {filter && (
        <div className="tab-skeleton__filter">
          <span className="tab-skeleton__field" />
          <span className="tab-skeleton__field tab-skeleton__field--short" />
          <span className="tab-skeleton__button" />
        </div>
      )}
      <div className="tab-skeleton__table">
        <div className="tab-skeleton__head">
          <span />
          <span />
          <span />
        </div>
        {Array.from({ length: ROWS }, (_, row) => (
          <div key={row} className="tab-skeleton__row">
            <span />
            <span />
            <span />
          </div>
        ))}
      </div>
      <div className="tab-skeleton__pager">
        <span />
        <span />
      </div>
    </div>
  </div>
);

export default TabPanelLoading;
