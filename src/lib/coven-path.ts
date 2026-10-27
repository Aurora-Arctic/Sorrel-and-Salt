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

/** What the viewer's role in the coven switched to may open, and what the page switched from opens in. */
export interface PathInCovenOptions {
  /** The role there may read members; without it the members and invitations pages are a 404. */
  canReadMembers?: boolean;
  /** The role there may invite; without it the invitations page is a 404 (an owner's alone). */
  canInvite?: boolean;
  /**
   * The slugs of the covens the page being left also opens in, when it is one
   * the address cannot vouch for: an ingredient's page, whose row the page has
   * read (M9.12). Absent, nothing beneath a section carries over.
   */
  opens?: readonly string[];
}

/**
 * Where the same page is in another workspace: `/coven/a/ingredients/x`
 * becomes `/coven/b/ingredients/x` when the page said it opens there (`opens`),
 * and `/coven/b/ingredients` when it did not. What lies beneath a section (an
 * ingredient, a spell) belongs to the workspace it was opened in, unless the
 * page vouched for the next, and would otherwise be a 404 there. Outside a
 * workspace, or at its index, the answer is the new workspace's index. A people
 * page the viewer's role cannot open there steps back: invitations to the
 * members page beside it when members are readable (a member reads them and
 * cannot invite), anything else to the index.
 */
export function pathInCoven(
  pathname: string,
  slug: string,
  { canReadMembers = true, canInvite = true, opens }: PathInCovenOptions = {},
): string {
  const parts = covenSlugOf(pathname) ? pathname.split('/') : [];
  const section = parts[3];
  const home = `/${COVEN}/${slug}`;
  if (!section) return home;
  if (section === 'invitations' && !canInvite) return canReadMembers ? `${home}/members` : home;
  if (PEOPLE_SECTIONS.has(section) && !canReadMembers) return home;
  if (opens?.includes(slug)) return `${home}/${parts.slice(3).join('/')}`;
  return `${home}/${section}`;
}

/**
 * What each section's page draws while it is on its way (M12.33): the page
 * that arrives, its heading and then what it holds. Ingredients is its cards
 * under a filter, and the grimoire its cards under the tab row (Spells and
 * Drafts) and a filter; the people pages are a table under the tab row (Members and,
 * for an owner, Invitations; the row draws for a lone tab too). The Invite
 * action is an owner's alone and the address does not say who is asking, so
 * it is left out.
 */
const PARTS_OF_SECTION: Record<string, Omit<NavigationTarget, 'region'>> = {
  ingredients: { shape: 'cards', title: true, filter: true },
  grimoire: { shape: 'cards', title: true, filter: true, tabs: true },
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
  if (slug && !section)
    return { region: 'coven', shape: 'page', frame: 'with-nav', head: 'eyebrow' };
  if (slug && section === 'ingredients' && beneath)
    return { region: 'coven', shape: 'page', frame: 'entry', head: 'eyebrow' };
  // Drafts is the grimoire's second tab, its list too; anything else beneath it is a spell's own page.
  if (slug && section === 'grimoire' && beneath && beneath !== 'drafts')
    return { region: 'coven', shape: 'page' };
  return { region: 'coven', ...((section && PARTS_OF_SECTION[section]) || { shape: 'page' }) };
}
