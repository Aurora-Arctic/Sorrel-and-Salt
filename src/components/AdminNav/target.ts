import type { NavigationTarget } from '../../lib/navigation';

type Parts = Omit<NavigationTarget, 'region'>;

const CURATED: Parts = { shape: 'table', title: true, tabs: true, action: true, filter: true };

// Keyed by first tab's address (claude-docs/components/admin-nav.md).
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
  '/keepers/support': {
    shape: 'table',
    title: true,
    tabs: true,
    tabsBelow: true,
    filter: true,
    fields: SUPPORT_FIELDS,
    columns: SUPPORT_COLUMNS,
  },
  '/keepers/documents/terms': { shape: 'document', title: true, tabs: true, tabsBelow: true },
  '/keepers/business-cards': { shape: 'form', title: true },
  '/keepers/users': CURATED,
};

// Any other keeper address (a later tab) is a titled table with no filter.
const FALLBACK: Parts = { shape: 'table', title: true };

export const adminTarget = (href: string): NavigationTarget => ({
  region: 'admin',
  ...(PARTS[href] ?? FALLBACK),
});
