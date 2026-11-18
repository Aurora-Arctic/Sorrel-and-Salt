import type { SiteLink } from './types';

// The Compendium is public, so its link is the one every viewer is offered, an unverified account's account menu included.
export const COMPENDIUM_LINK: SiteLink = {
  label: 'Compendium',
  href: '/compendium',
  base: '/compendium',
  open: true,
};
