import type { NavigationTarget } from '../../lib/navigation';

/**
 * What a site link's page draws while it is on its way (M12.33): the
 * Compendium opens on its cards, every other destination on a page. The bar's
 * links and the account menu's copies of them share this.
 */
export const siteLinkTarget = (base: string): NavigationTarget => ({
  region: 'main',
  shape: base === '/compendium' ? 'cards' : 'page',
});
