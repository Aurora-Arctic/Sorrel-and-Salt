import type { NavigationTarget } from './navigation';

// A workspace is named by the address alone, never by session state, so two
// tabs can sit in two workspaces without disagreeing (M6.9). These read and
// rewrite that address: the segment after `/coven/` is the slug.
const COVEN = 'coven';

/**
 * The segment the create-workspace page sits at (M9.16). Beneath `/coven/`
 * like the workspaces, so a static segment beside `[slug]`; the slug rule
 * below keeps it from ever being a workspace's, or a coven named "New" could
 * never be reached.
 */
const NEW = 'new';

/**
 * The landing everyone who leaves a coven is sent to: where someone in no
 * coven lands, and which opens the first coven of someone who has another
 * (M2.8).
 */
export const COVEN_LANDING_PATH = `/${COVEN}`;

/** The create-workspace page's address. */
export const NEW_COVEN_PATH = `/${COVEN}/${NEW}`;

/**
 * Whether a slug is an address the router already answers, and so one no
 * workspace may take. The creation service asks before writing a slug, the
 * one place a workspace slug is minted.
 */
export function isReservedCovenSlug(slug: string): boolean {
  return slug === NEW;
}

/** The workspace slug an address is in, or `null` outside any workspace, the create page included. */
export function covenSlugOf(pathname: string): string | null {
  const [, first, slug] = pathname.split('/');
  return first === COVEN && slug && !isReservedCovenSlug(slug) ? slug : null;
}

/** The sections only a role that can read members may open. */
const PEOPLE_SECTIONS = new Set(['members', 'invitations']);

/**
 * Where the same section is in another workspace: `/coven/a/ingredients/x`
 * becomes `/coven/b/ingredients`. Only the section carries over, since what
 * lies beneath it (an ingredient, a spell) belongs to the workspace it was
 * opened in and would be a 404 in the next. Outside a workspace, or at its
 * index, the answer is the new workspace's index. So it is for a people
 * section (members, invitations) when the viewer cannot read members there.
 */
export function pathInCoven(pathname: string, slug: string, canReadMembers = true): string {
  const section = covenSlugOf(pathname) ? pathname.split('/')[3] : undefined;
  // The people pages answer a viewer with a 404, so a viewer lands on the index instead.
  if (section && PEOPLE_SECTIONS.has(section) && !canReadMembers) return `/${COVEN}/${slug}`;
  return section ? `/${COVEN}/${slug}/${section}` : `/${COVEN}/${slug}`;
}

/**
 * What each section's page draws while it is on its way (M12.33): the page
 * that arrives, its heading and then what it holds. Ingredients is its cards
 * under a filter; the people pages are a table under the tab row (Members and,
 * for an owner, Invitations; the row draws for a lone tab too). The Invite
 * action is an owner's alone and the address does not say who is asking, so
 * it is left out.
 */
const PARTS_OF_SECTION: Record<string, Omit<NavigationTarget, 'region'>> = {
  ingredients: { shape: 'cards', title: true, filter: true },
  members: { shape: 'table', title: true, tabs: true },
  invitations: { shape: 'table', title: true, tabs: true },
};

/**
 * What a coven page draws while it is on its way: the parts of the section the
 * address names. The coven's home is a page with its contents menu beside it,
 * and so is one ingredient's page (the address has an id beneath
 * `ingredients`: its jump menu stands beside it, not the list's cards); a
 * section not named is a plain page. One mapping for the switcher, the
 * section nav, the home's Contents and the links into an ingredient.
 */
export function covenTarget(pathname: string): NavigationTarget {
  const slug = covenSlugOf(pathname);
  const section = slug ? pathname.split('/')[3] : undefined;
  const beneath = slug ? pathname.split('/')[4] : undefined;
  if (slug && (!section || (section === 'ingredients' && beneath))) {
    return { region: 'coven', shape: 'page', frame: 'with-nav' };
  }
  return { region: 'coven', ...((section && PARTS_OF_SECTION[section]) || { shape: 'page' }) };
}
