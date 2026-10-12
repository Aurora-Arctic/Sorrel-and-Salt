import type { Route } from 'next';

export interface CovenNavProps {
  slug: string;
}

// One section link: its label and the address it goes to. `exact` marks an
// entry that is current only at its own address, which the index needs since
// it is the ancestor of every coven page.
export interface CovenSection {
  label: string;
  href: Route;
  exact?: boolean;
}

export interface NavLinksProps {
  sections: readonly CovenSection[];
}
