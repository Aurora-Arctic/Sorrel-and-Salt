import { covenSlugOf, covenTarget } from '../../lib/coven-path';
import type { NavigationTarget } from '../../lib/navigation';

/**
 * What a site link's page draws while it is on its way, in the frame the page sits in. The bar's links
 * and the account menu's copies of them share this.
 */
export const siteLinkTarget = (base: string, href: string = base): NavigationTarget => {
  if (base === '/compendium') {
    return {
      region: 'main',
      shape: 'cards',
      frame: 'wide',
      head: 'eyebrow',
      title: true,
      filter: true,
    };
  }
  if (base === '/coven') {
    return href === base
      ? { region: 'main', shape: 'page', frame: 'narrow' }
      : { region: 'main', shape: 'page', frame: 'with-nav', head: 'eyebrow' };
  }
  if (base === '/admin') return { region: 'main', shape: 'contents', frame: 'wide' };
  return { region: 'main', shape: 'page' };
};

/**
 * What a link into the ingredients draws while it is on its way, from the address alone. A coven's
 * entry is the coven region's (`fromCoven`: only the coven's body changes); anything else changes the
 * whole main. None for any other address.
 */
export const ingredientLinkTarget = (
  href: string,
  fromCoven: boolean = true,
): NavigationTarget | undefined => {
  const path = href.split(/[?#]/)[0] ?? href;
  if (path.startsWith('/compendium/ingredients/')) {
    return { region: 'main', shape: 'page', frame: 'entry', head: 'eyebrow' };
  }
  if (path === '/compendium') return siteLinkTarget('/compendium');
  if (covenSlugOf(path) === null) return undefined;
  const target = covenTarget(path);
  return fromCoven ? target : { ...target, region: 'main' };
};
