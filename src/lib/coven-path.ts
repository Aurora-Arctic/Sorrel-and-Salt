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

/**
 * Where the same section is in another workspace: `/coven/a/ingredients/x`
 * becomes `/coven/b/ingredients`. Only the section carries over, since what
 * lies beneath it (an ingredient, a spell) belongs to the workspace it was
 * opened in and would be a 404 in the next. Outside a workspace, or at its
 * index, the answer is the new workspace's index.
 */
export function pathInCoven(pathname: string, slug: string): string {
  const section = covenSlugOf(pathname) ? pathname.split('/')[3] : undefined;
  return section ? `/${COVEN}/${slug}/${section}` : `/${COVEN}/${slug}`;
}
