import type { NavigationTarget } from '../../lib/navigation';

type Parts = Omit<NavigationTarget, 'region'>;

/** A curated list's first tab: the tab row, Add beside the heading, a filter, a table. */
const CURATED: Parts = { shape: 'table', title: true, tabs: true, action: true, filter: true };

/**
 * What each admin page draws while it is on its way (M12.33), keyed by the
 * address the nav and the index link it at, its first tab. The admin area has
 * its own body under its context row, so every wait is the `admin` region's
 * and the row with its nav stays. The wait is the page that arrives: its
 * heading, the action at the heading's end, its filter row, then the list.
 * The index is sections of links and draws its own heading. A tabbed page draws its tab
 * row between the heading and the action; the Compendium has one tab and so
 * no row.
 */
const PARTS: Record<string, Parts> = {
  '/admin': { shape: 'contents' },
  '/admin/compendium': { shape: 'cards', title: true, action: true, filter: true },
  '/admin/categories': CURATED,
  '/admin/forms': CURATED,
  '/admin/deities': CURATED,
  '/admin/celestial-bodies': CURATED,
  // Its action is the pause control; the filter is the user search.
  '/admin/users': CURATED,
};

// Any other admin address (a later tab) is a titled table with no filter.
const FALLBACK: Parts = { shape: 'table', title: true };

export const adminTarget = (href: string): NavigationTarget => ({
  region: 'admin',
  ...(PARTS[href] ?? FALLBACK),
});
