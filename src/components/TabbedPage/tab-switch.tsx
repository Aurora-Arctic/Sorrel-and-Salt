'use client';

import { type ReactElement, createContext, useContext, useState } from 'react';
import { usePendingNavigation } from '../../lib/navigation';
import SwapPanel from '../Skeleton/swap-panel';
import type {
  PageTab,
  TabActionProps,
  TabPanelProps,
  TabSwitch,
  TabSwitchProviderProps,
} from './types';

// A tab pressed on its way (MB.115, the owner's call): the tab row and the
// heading's action grey out and the panel shows the new tab's skeleton from
// the press until the new tab has rendered. Held by a transition rather than
// a route group's `loading.tsx`, so a direct request renders the whole page
// on the server with nothing streamed ahead of it
// (claude-docs/components/tabbed-page.md).

/**
 * Whether a tab is on its way, which, and the way to press one. Exported for
 * the workshop, whose stub router goes nowhere, to draw a tab on its way.
 */
export const TabSwitchContext = createContext<TabSwitch | null>(null);

/**
 * Holds the switch the row, the action and the panel share. The navigation
 * runs inside this transition, so `pending` stays true until Next has
 * rendered the new tab; a provider already above, the workshop's, is kept
 * rather than shadowed.
 */
export const TabSwitchProvider = ({ children }: TabSwitchProviderProps): ReactElement => {
  const outer = useContext(TabSwitchContext);
  const { pending, navigate } = usePendingNavigation();
  const [target, setTarget] = useState<PageTab>();
  const value = outer ?? {
    pending,
    target,
    go: (tab) => {
      setTarget(tab);
      navigate(tab.href);
    },
  };
  return <TabSwitchContext.Provider value={value}>{children}</TabSwitchContext.Provider>;
};

export function useTabSwitch(): TabSwitch {
  const value = useContext(TabSwitchContext);
  if (!value) throw new Error('A tab row or panel renders inside TabbedPage.');
  return value;
}

/**
 * The open tab's action, at the end of the heading's line: greyed out and
 * `inert` while another tab is on its way, so it can be neither pressed nor
 * focused, until the new tab's action replaces it. Empty for a tab with
 * none, which the stylesheet then takes out of the line.
 */
export const TabAction = ({ children }: TabActionProps): ReactElement => {
  const { pending } = useTabSwitch();
  return (
    <div className="tabbed-page__action" inert={pending || undefined}>
      {children}
    </div>
  );
};

/**
 * The open tab's content, or the pressed tab's skeleton in its place while it
 * is on its way (`SwapPanel`).
 */
export const TabPanel = ({ children }: TabPanelProps): ReactElement => {
  const { pending, target } = useTabSwitch();
  return (
    <SwapPanel
      pending={pending}
      className="tabbed-page__panel"
      filter={target?.filtered}
      shape={target?.shape}
    >
      {children}
    </SwapPanel>
  );
};
