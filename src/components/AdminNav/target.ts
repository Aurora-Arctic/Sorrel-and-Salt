import type { NavigationTarget } from '../../lib/navigation';

type Parts = Omit<NavigationTarget, 'region'>;

/** A curated list's first tab: the tab row, Add beside the heading, a filter, a table. */
const CURATED: Parts = { shape: 'table', title: true, tabs: true, action: true, filter: true };

/**
 * What each admin page draws while it is on its way, keyed by its first tab's address: the page that
 * arrives (heading, action, filter row, list) under the `admin` row. The index draws its own heading;
 * a tabbed page draws its tab row between heading and action (claude-docs/components/admin-nav.md).
 */
const SUPPORT_FIELDS = 3;
const SUPPORT_COLUMNS = 9;

const PARTS: Record<string, Parts> = {
  '/curator': { shape: 'contents' },
  '/keepers': { shape: 'contents' },
  '/curator/compendium': { shape: 'cards', title: true, action: true, filter: true },
  '/curator/categories': CURATED,
  '/curator/forms': CURATED,
  '/curator/deities': CURATED,
  '/curator/celestial-bodies': CURATED,
  // The view tabs on a line beneath the heading, a three-control filter and the nine columns of SupportRequests.
  '/keepers/support': {
    shape: 'table',
    title: true,
    tabs: true,
    tabsBelow: true,
    filter: true,
    fields: SUPPORT_FIELDS,
    columns: SUPPORT_COLUMNS,
  },
  // The four document editors, the tab row on a line beneath the heading, with no action or filter.
  '/keepers/documents/privacy': { shape: 'document', title: true, tabs: true, tabsBelow: true },
  // Its action is the pause control; the filter is the user search.
  '/keepers/users': CURATED,
};

// Any other keeper address (a later tab) is a titled table with no filter.
const FALLBACK: Parts = { shape: 'table', title: true };

export const adminTarget = (href: string): NavigationTarget => ({
  region: 'admin',
  ...(PARTS[href] ?? FALLBACK),
});
