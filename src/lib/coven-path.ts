// A workspace is named by the address alone, never by session state, so two
// tabs can sit in two workspaces without disagreeing (M6.9). These two read
// and rewrite that address: the segment after `/coven/` is the slug.
const COVEN = 'coven';

/** The workspace slug an address is in, or `null` outside any workspace. */
export function covenSlugOf(pathname: string): string | null {
  const [, first, slug] = pathname.split('/');
  return first === COVEN && slug ? slug : null;
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
