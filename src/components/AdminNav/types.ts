import type { SectionIconName } from '../SectionNav/types';
import type { PageTab } from '../TabbedPage/types';

export interface AdminPage {
  label: string;
  icon: SectionIconName;
  description: string;
  tabs: readonly [PageTab, ...PageTab[]];
  adminOnly?: true;
}

export interface AdminSection {
  name: string;
  pages: readonly AdminPage[];
}

export interface AdminNavProps {
  managesPeople: boolean;
  needsStaff?: number;
}

export interface ContentsProps {
  sections: readonly AdminSection[];
}
