import type { NavigationTarget } from '../../lib/navigation';

/**
 * What an admin page draws while it is on its way (M12.33). The admin area
 * has its own body under its context row, so every wait is the `admin`
 * region's and the row with its nav stays: the
 * Compendium page opens on its cards, the index on a page, and the rest
 * (people, invitations, the curated vocabularies) on a table.
 */
export const adminTarget = (href: string): NavigationTarget => ({
  region: 'admin',
  shape: href === '/admin' ? 'page' : href === '/admin/compendium' ? 'cards' : 'table',
});
