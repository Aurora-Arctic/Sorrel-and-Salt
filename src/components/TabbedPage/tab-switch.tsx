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

// A tab pressed on its way: the row and the action grey out and the panel shows the new tab's skeleton until it has rendered,
// held by a transition (claude-docs/components/tabbed-page.md, "Pressing a tab").

/** Whether a tab is on its way, which, and the way to press one; exported so the workshop's stub router can draw a tab on its way. */
export const TabSwitchContext = createContext<TabSwitch | null>(null);

/** Holds the switch the row, the action and the panel share; the navigation runs inside this transition, and a provider already above is kept. */
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

/** The open tab's action, greyed out and `inert` while another tab is on its way; empty for a tab with none, which the stylesheet takes out of the line. */
export const TabAction = ({ children }: TabActionProps): ReactElement => {
  const { pending } = useTabSwitch();
  return (
    <div className="tabbed-page__action" inert={pending || undefined}>
      {children}
    </div>
  );
};

/** The open tab's content, or the pressed tab's skeleton in its place while it is on its way (`SwapPanel`). */
export const TabPanel = ({ children }: TabPanelProps): ReactElement => {
  const { pending, target } = useTabSwitch();
  return (
    <SwapPanel
      pending={pending}
      className="tabbed-page__panel"
      filter={target?.filtered}
      shape={target?.shape}
      count={target?.sections}
      density={target?.density}
    >
      {children}
    </SwapPanel>
  );
};
