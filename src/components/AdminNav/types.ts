import type { SectionIconName } from '../SectionNav/types';
import type { PageTab } from '../TabbedPage/types';

// One admin page: what it is called, the one line the `/admin` index says about
// it, and its tabs, each at its own address. A page of one tab, the compendium,
// draws no tab row; the nav and the index link a page at its first tab.
export interface AdminPage {
  label: string;
  /** The icon the nav draws beside the label (`SectionNav/icons.tsx`). */
  icon: SectionIconName;
  description: string;
  tabs: readonly [PageTab, ...PageTab[]];
  /** Shown to an admin alone: a curator manages no one. */
  adminOnly?: true;
}

// A titled group of admin pages, as the nav's row (a hairline between
// groups) and the `/admin` index both show them.
export interface AdminSection {
  name: string;
  pages: readonly AdminPage[];
}

// What the nav and the index take: whether the viewer is an admin, and so
// sees the People page, or a curator, who does not.
export interface AdminNavProps {
  managesPeople: boolean;
  /** The requests waiting on staff, said in the Support link's text; left out, the link says only its name. */
  needsStaff?: number;
}
