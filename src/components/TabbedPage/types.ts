import type { Route } from 'next';
import type { ReactNode } from 'react';

/** One tab: its own address, and the short label the tab row shows, title case. */
export interface PageTab {
  href: Route;
  label: string;
}

export interface TabbedPageProps {
  /** The page's `h1`, title case, which names the tabs' nav too: "Categories". */
  title: string;
  /** In their order along the row; the open one is found from the address. */
  tabs: readonly PageTab[];
  /** The open tab's content. */
  children: ReactNode;
}

export interface TabLinksProps {
  tabs: readonly PageTab[];
}

export interface TabActionsProps {
  /** The tab's own action: an Add link, or a control such as Pause Admin Changes. */
  children: ReactNode;
}

/** A tab on its way, shared by the tab row and the panel (`tab-switch.tsx`). */
export interface TabSwitch {
  /** True from a tab's press until Next has rendered it. */
  pending: boolean;
  /** Navigates to a tab inside the switch's transition. */
  go: (href: Route) => void;
}

export interface TabSwitchProviderProps {
  children: ReactNode;
}

export interface TabPanelProps {
  /** The open tab's content, which the loading state replaces while a tab is on its way. */
  children: ReactNode;
}
