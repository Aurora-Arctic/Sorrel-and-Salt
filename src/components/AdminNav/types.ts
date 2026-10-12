import type { PageTab } from '../TabbedPage/types';

// One admin page: what it is called, the one line the `/admin` index says
// about it, and its tabs, each at its own address. A page of one tab, the
// compendium, draws no tab row; the nav and the index link a page at its
// first tab.
export interface AdminPage {
  label: string;
  description: string;
  tabs: readonly [PageTab, ...PageTab[]];
}

// A titled group of admin pages, as the nav's phone disclosure and the
// `/admin` index both show them.
export interface AdminSection {
  name: string;
  pages: readonly AdminPage[];
}

export interface NavLinksProps {
  sections: readonly AdminSection[];
}
