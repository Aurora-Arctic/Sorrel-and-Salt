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
