import type { Route } from 'next';
import type { ReactNode } from 'react';

export interface PageTab {
  href: Route;
  label: string;
  count?: number;
  /** Whether the tab's list opens with a filter, so its loading skeleton draws a filter row; left out, none. */
  filtered?: boolean;
  shape?: 'table' | 'cards' | 'sections' | 'requests' | 'document';
  sections?: number;
  columns?: number;
  fields?: number;
  /** With `cards`: the tab's list opens compact, so its loading skeleton does too. */
  density?: 'compact';
  /** With `cards`: the card the list draws, so its loading skeleton does too: the grimoire's spell card. */
  card?: 'spell';
}

export interface TabbedPageProps {
  title: string;
  tabs: readonly PageTab[];
  action?: ReactNode;
  framed?: boolean;
  /** Puts the row on a line of its own beneath the heading at every width, instead of on the heading's line. */
  tabsBelow?: boolean;
  /** The open tab's `href`, for tabs told apart by their query rather than their path; left out, it is found from the pathname. */
  open?: string;
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
  children: ReactNode;
}

export interface TabPanelLoadingProps {
  filter?: boolean;
  shape?: 'table' | 'cards' | 'sections' | 'requests' | 'document';
  count?: number;
  columns?: number;
  fields?: number;
  density?: 'compact';
  card?: 'spell';
}

export interface TabPanelProps {
  children: ReactNode;
}
