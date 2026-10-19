import type { NavigationTarget } from '../../lib/navigation';

/**
 * What an admin page draws while it is on its way (M12.33). The admin area
 * sits inside the shell's body, so every wait is the `main` region's: the
 * Compendium page opens on its cards, the index on a page, and the rest
 * (people, invitations, the curated vocabularies) on a table.
 */
export const adminTarget = (href: string): NavigationTarget => ({
  region: 'main',
  shape: href === '/admin' ? 'page' : href === '/admin/compendium' ? 'cards' : 'table',
});
