import type { Route } from 'next';
import type { ReactNode } from 'react';

/** One tab: its own address, and the short label the tab row shows, title case. */
export interface PageTab {
  href: Route;
  label: string;
  /** A number shown after the label, "Mine (3)"; left out, none. */
  count?: number;
  /** Whether the tab's list opens with a filter, so its loading skeleton draws a filter row; left out, none. */
  filtered?: boolean;
  /** What the tab's loading skeleton stands in for: a table (the default), or cards, as the grimoire's tabs. */
  shape?: 'table' | 'cards' | 'sections' | 'requests';
  /** With the `sections` shape: how many panels the skeleton draws, to match the tab's own. */
  sections?: number;
  /** With `cards`: the tab's list opens compact, so its loading skeleton does too. */
  density?: 'compact';
}

export interface TabbedPageProps {
  /** The page's `h1`, title case, which names the tabs' nav too: "Categories". */
  title: string;
  /** In their order along the row; the open one is found from the address. */
  tabs: readonly PageTab[];
  /** The open tab's one action at the end of the heading's line, from the route group's `@action` slot; nothing for a tab with none. */
  action?: ReactNode;
  /** The page's tabs hold a `.page-with-nav` column (the account): the head stands over the sections' column and the tabs sit beneath it at every width. */
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

/** A tab on its way, shared by the tab row and the panel (`tab-switch.tsx`). */
export interface TabSwitch {
  /** True from a tab's press until Next has rendered it. */
  pending: boolean;
  /** The tab last pressed, whose skeleton the panel draws while it is on its way. */
  target?: PageTab;
  /** Navigates to a tab inside the switch's transition. */
  go: (tab: PageTab) => void;
}

export interface TabSwitchProviderProps {
  children: ReactNode;
}

export interface TabActionProps {
  /** The open tab's action, which greys out while another tab is on its way. */
  children: ReactNode;
}

export interface TabPanelLoadingProps {
  /** Whether to draw a filter row above the table: the pressed tab's `filtered`. */
  filter?: boolean;
  /** What the skeleton stands in for: `table` (the default), or `cards`, the grid of ingredient cards, or `sections`, an account tab's menu and panels. */
  shape?: 'table' | 'cards' | 'sections' | 'requests';
  /** With `sections`: how many panels it draws. */
  count?: number;
  /** The density of a `cards` skeleton: the pressed tab's `density`. */
  density?: 'compact';
}

export interface TabPanelProps {
  /** The open tab's content, which the loading state replaces while a tab is on its way. */
  children: ReactNode;
}
