import type { ReactElement } from 'react';

// What a tab's panel shows while the tab just pressed loads: its route
// group's `loading.tsx` renders it beneath the page's heading and tabs, which
// stay where they are (MB.115). An `<output>`, a status by its tag, so a
// screen reader hears that something is on the way; held back a moment by
// the stylesheet, so a tab that loads at once never flashes it.
const TabPanelLoading = (): ReactElement => (
  <output className="tabbed-page__loading">
    <span className="spinner" aria-hidden="true" />
    Loading
  </output>
);

export default TabPanelLoading;
