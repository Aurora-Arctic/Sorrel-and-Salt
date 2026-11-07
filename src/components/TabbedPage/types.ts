import type { Route } from 'next';
import type { ReactNode } from 'react';

export interface PageTab {
  href: Route;
  label: string;
  /** A number shown after the label as a facet count, "Mine 3", and "99+" from 100; left out, none. */
  count?: number;
  /** What the panel draws while this tab is on its way: the tab's own placeholder, built from the components its page draws. */
  skeleton?: ReactNode;
}

export interface TabbedPageProps {
  /** The element drawn: `main` (the default), or `div` for a skeleton inside a body that already has the page's one landmark. */
  as?: 'main' | 'div';
  title: string;
  tabs: readonly PageTab[];
  action?: ReactNode;
  framed?: boolean;
  /** Puts the row on a line of its own beneath the heading at every width, instead of on the heading's line. */
  tabsBelow?: boolean;
  /** The open tab's `href`, for tabs told apart by their query rather than their path; left out, it is found from the pathname. */
  open?: string;
  /** The open tab's content. */
  children: ReactNode;
}

export interface TabLinksProps {
  tabs: readonly PageTab[];
  /** The open tab's `href`, for tabs told apart by their query rather than their path; left out, the open tab is found from the pathname. */
  open?: string;
}

export interface TabSwitch {
  /** True from a tab's press until Next has rendered it. */
  pending: boolean;
  target?: PageTab;
  go: (tab: PageTab) => void;
}

export interface TabSwitchProviderProps {
  children: ReactNode;
}

export interface TabActionProps {
  /** The open tab's action, which greys out while another tab is on its way. */
  children: ReactNode;
}

export interface TabPanelProps {
  /** The open tab's content, which the loading state replaces while a tab is on its way. */
  children: ReactNode;
}
