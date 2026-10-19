import { covenSlugOf, covenTarget } from '../../lib/coven-path';
import type { NavigationTarget } from '../../lib/navigation';

/**
 * What a site link's page draws while it is on its way (M12.33), in the
 * frame the page itself sits in. The Compendium opens on its cards under a
 * heading and a filter, in the wide column; the coven index in the forms'
 * column; a coven's own home (a lone coven's link goes straight to it) as a
 * page with its contents menu; the admin index as wide sections of links. The bar's
 * links and the account menu's copies of them share this.
 */
export const siteLinkTarget = (base: string, href: string = base): NavigationTarget => {
  if (base === '/compendium') {
    return { region: 'main', shape: 'cards', frame: 'wide', title: true, filter: true };
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
 * What the page a link into the ingredients draws while it is on its way
 * (M12.33), from the address alone. A compendium entry is a wide page with its
 * jump menu; a coven's entry sits under the coven's context row, so it is the
 * coven region's (`fromCoven`: the press starts inside a coven, where the
 * coven's body is what changes; from anywhere else the whole main changes
 * and the wait is the main region's); the Compendium search a See All opens is
 * the Compendium's list. None for an address that is none of these.
 */
export const ingredientLinkTarget = (
  href: string,
  fromCoven: boolean = true,
): NavigationTarget | undefined => {
  const path = href.split(/[?#]/)[0] ?? href;
  if (path.startsWith('/compendium/ingredients/')) {
    return { region: 'main', shape: 'page', frame: 'with-nav' };
  }
  if (path === '/compendium') return siteLinkTarget('/compendium');
  if (covenSlugOf(path) === null) return undefined;
  const target = covenTarget(path);
  return fromCoven ? target : { ...target, region: 'main' };
};
