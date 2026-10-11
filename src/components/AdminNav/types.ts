import type { Route } from 'next';

// One admin page: where it goes, what it is called, and the one line the
// `/admin` index says about it.
export interface AdminPage {
  href: Route;
  label: string;
  description: string;
}

// A titled group of admin pages: a list beside the group list that organises
// it, or a single page that stands alone.
export interface AdminSection {
  name: string;
  pages: readonly AdminPage[];
}

export interface NavLinksProps {
  sections: readonly AdminSection[];
}
