import { and, eq } from 'drizzle-orm';
import { workspaceSlugs } from '../../modules/coven/schema/workspace-slugs';
import { workspaces } from '../../modules/coven/schema/workspaces';
import type { Membership } from '@/modules/coven';
import { notSoftDeleted, scopedTo } from './predicates';
import { selectFrom, selectOne } from './select';
import type { AuditWriter, WorkspaceRow, WorkspaceSlugRow, WriterContext } from './types';

/**
 * The live coven holding `slug`, as its current address or as an old one, with which of the two it is. Takes no proof, so no
 * caller may reach for it casually: a request for an address names a coven before any membership exists to prove
 * (`tests/guards/workspace-slug-lookup.test.ts` pins the callers). Both the coven and the address row must be live.
 */
export async function findWorkspaceHoldingSlug(
  slug: string,
): Promise<{ workspace: WorkspaceRow; current: boolean } | undefined> {
  const address = await selectOne(
    workspaceSlugs,
    and(notSoftDeleted(workspaceSlugs), eq(workspaceSlugs.slug, slug)),
  );
  if (!address) return undefined;
  const workspace = await selectOne(
    workspaces,
    and(notSoftDeleted(workspaces), eq(workspaces.id, address.workspaceId)),
  );
  return workspace ? { workspace, current: workspace.slug === slug } : undefined;
}

/** Every live address, current and old, of the proof's coven. */
export function findWorkspaceSlugs(membership: Membership): Promise<WorkspaceSlugRow[]> {
  return selectFrom(
    workspaceSlugs,
    and(notSoftDeleted(workspaceSlugs), scopedTo(membership, workspaceSlugs)),
  );
}

/**
 * The table's only writes (`namedWrites`). A coven's address rows are never moved or removed on their own: a rename adds, and a
 * delete retires the coven's rows with it.
 */
export function workspaceSlugWrites({
  insert,
  update,
}: WriterContext): Pick<AuditWriter, 'insertWorkspaceSlug' | 'updateWorkspaceName'> {
  const holds = async (workspaceId: string, slug: string): Promise<boolean> =>
    Boolean(
      await selectOne(
        workspaceSlugs,
        and(
          notSoftDeleted(workspaceSlugs),
          eq(workspaceSlugs.workspaceId, workspaceId),
          eq(workspaceSlugs.slug, slug),
        ),
      ),
    );
  const record = async (workspaceId: string, slug: string): Promise<void> => {
    if (!(await holds(workspaceId, slug))) await insert(workspaceSlugs, { workspaceId, slug });
  };

  return {
    insertWorkspaceSlug: (workspaceId, slug) => insert(workspaceSlugs, { workspaceId, slug }),
    // The previous address is recorded too, since a coven made before the table may hold no row for it. Returning to an address
    // the coven held reuses its row.
    updateWorkspaceName: async (membership, { name, slug }) => {
      const before = await selectOne(
        workspaces,
        and(notSoftDeleted(workspaces), eq(workspaces.id, membership.workspaceId)),
      );
      if (!before) return [];
      await record(before.id, before.slug);
      await record(before.id, slug);
      return update(workspaces, { name, slug }, eq(workspaces.id, before.id));
    },
  };
}
