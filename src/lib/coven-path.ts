// A workspace is named by the address alone, never by session state, so two
// tabs can sit in two workspaces without disagreeing. These read and
// rewrite that address: the segment after `/coven/` is the slug.
const COVEN = 'coven';

/**
 * The segment the create-workspace page sits at: a static segment beside `[slug]`, which the slug rule keeps from ever being a
 * workspace's, or a coven named "New" could never be reached.
 */
const NEW = 'new';

/**
 * The landing everyone who leaves a coven is sent to: where someone in no
 * coven lands, and which opens the first coven of someone who has another
 *.
 */
export const COVEN_LANDING_PATH = `/${COVEN}`;

/** The create-workspace page's address. */
export const NEW_COVEN_PATH = `/${COVEN}/${NEW}`;

/** The value of `?new` that opens the current grimoire's New Spell. */
export const NEW_SPELL = 'spell';

/** The value of `?new` that opens the default coven's Add Ingredient. */
export const NEW_INGREDIENT = 'ingredient';

/**
 * The value of `?new` that opens the compendium's New Entry on `/curator/compendium`. A bare
 * `?new` there still reads as it, so a link saved before the value existed keeps working.
 */
export const NEW_COMPENDIUM_ENTRY = 'ingredient-compendium';

/** `?new=ingredient-coven-<slug>` opens that coven's Add Ingredient, on any page in the shell. */
export const NEW_COVEN_INGREDIENT_PREFIX = 'ingredient-coven-';

/** `?new=spell-<slug>` opens that coven's New Spell, over its grimoire. */
export const NEW_SPELL_PREFIX = 'spell-';

/**
 * The `?new` values that are a word alone, reserved as slugs. The others start with a fixed prefix (`spell-`,
 * `ingredient-coven-`) and end with the whole slug, so need no reservation (claude-docs/design-decisions/m10.12-spell-builder-modal.md).
 */
const DIALOG_VALUES = new Set([NEW_SPELL, NEW_INGREDIENT]);

/**
 * Whether a slug is an address the router already answers, or a value of
 * `?new` that opens a dialog, and so one no workspace may take. The creation
 * service asks before writing a slug, the one place a workspace slug is minted.
 */
export function isReservedCovenSlug(slug: string): boolean {
  return slug === NEW || DIALOG_VALUES.has(slug);
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
  /** The role there may invite; without it the invitations page is a 404 (a steward's alone). */
  canInvite?: boolean;
  /**
   * The slugs of the covens the page being left also opens in, when it is one
   * the address cannot vouch for: an ingredient's page, whose row the page has
   * read. Absent, nothing beneath a section carries over.
   */
  opens?: readonly string[];
}

/**
 * Where the same page is in another workspace: a section's index, or a page beneath
 * it only when the page said it opens there. A people page the viewer's role cannot
 * open steps back to the members page or the index. (claude-docs/modules.md, "Moving a page to another coven")
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
