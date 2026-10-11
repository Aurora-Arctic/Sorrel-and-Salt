import type { Route } from 'next';

// One entry of the admin nav: where it goes and what it is called.
export interface AdminResource {
  href: Route;
  label: string;
}

export interface NavLinksProps {
  resources: readonly AdminResource[];
}
