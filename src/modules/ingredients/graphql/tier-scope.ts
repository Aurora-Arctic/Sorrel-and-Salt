/** The tier the `workspaceId` argument names, as a scope: null writes the compendium's (curators only), a coven's admits anyone signed in. */
export const tierScope = (_root: unknown, { workspaceId }: { workspaceId?: string | null }) =>
  workspaceId == null ? { curator: true } : { signedIn: true };
