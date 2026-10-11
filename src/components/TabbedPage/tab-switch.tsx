'use client';

import { useRouter } from 'next/navigation';
import { type ReactElement, createContext, useContext, useState, useTransition } from 'react';
import TabPanelLoading from './panel-loading';
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
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<PageTab>();
  const value = outer ?? {
    pending,
    target,
    go: (tab) => {
      setTarget(tab);
      startTransition(() => router.push(tab.href));
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
 * is on its way. Keyed by which it shows, so each mounts afresh and fades in
 * (the stylesheet): the skeleton as the press takes the old content away, and
 * the new content as it replaces the skeleton. Content that was there from
 * the server's render, before any tab was pressed, is marked as such and
 * shown at once.
 */
export const TabPanel = ({ children }: TabPanelProps): ReactElement => {
  const { pending, target } = useTabSwitch();
  const [switched, setSwitched] = useState(false);
  if (pending && !switched) setSwitched(true);
  return pending ? (
    <div key="loading" className="tabbed-page__panel">
      <TabPanelLoading filter={target?.filtered} />
    </div>
  ) : (
    <div key="content" className="tabbed-page__panel" data-arrived={switched || undefined}>
      {children}
    </div>
  );
};
