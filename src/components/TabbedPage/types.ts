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
  /** The open tab's content, or its loading state. */
  children: ReactNode;
}

export interface TabLinksProps {
  tabs: readonly PageTab[];
}

export interface TabActionsProps {
  /** The tab's own action: an Add link, or a control such as Pause Admin Changes. */
  children: ReactNode;
}
