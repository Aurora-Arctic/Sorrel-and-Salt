import { and, eq, inArray, ne, notInArray } from 'drizzle-orm';
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
 * The table's only writes (`namedWrites`). Taking an address retires, in the same transaction, the old-address row of any other coven
 * that held it, without that coven's proof; a coven keeps one old address, so a rename drops the one before it.
 */
export function workspaceSlugWrites({
  insert,
  update,
  softDelete,
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
  // A coven's current address is never retired here, so the unique index refuses a claim on it.
  const retireOthers = async (workspaceId: string, slug: string): Promise<void> => {
    const others = await selectFrom(
      workspaceSlugs,
      and(
        notSoftDeleted(workspaceSlugs),
        eq(workspaceSlugs.slug, slug),
        ne(workspaceSlugs.workspaceId, workspaceId),
      ),
    );
    const stale: string[] = [];
    for (const row of others) {
      const owner = await selectOne(
        workspaces,
        and(notSoftDeleted(workspaces), eq(workspaces.id, row.workspaceId)),
      );
      if (!owner || owner.slug !== slug) stale.push(row.id);
    }
    if (stale.length > 0) await softDelete(workspaceSlugs, inArray(workspaceSlugs.id, stale));
  };
  const claim = async (workspaceId: string, slug: string): Promise<void> => {
    await retireOthers(workspaceId, slug);
    if (!(await holds(workspaceId, slug))) await insert(workspaceSlugs, { workspaceId, slug });
  };

  return {
    insertWorkspaceSlug: async (workspaceId, slug) => {
      await retireOthers(workspaceId, slug);
      return insert(workspaceSlugs, { workspaceId, slug });
    },
    // The previous address is recorded too, since a coven made before the table may hold no row for it. Every other row of the
    // coven is retired, and returning to its previous address reuses that row.
    updateWorkspaceName: async (membership, { name, slug }) => {
      const before = await selectOne(
        workspaces,
        and(notSoftDeleted(workspaces), eq(workspaces.id, membership.workspaceId)),
      );
      if (!before) return [];
      await claim(before.id, before.slug);
      if (slug === before.slug) return update(workspaces, { name }, eq(workspaces.id, before.id));
      await claim(before.id, slug);
      await softDelete(
        workspaceSlugs,
        and(
          eq(workspaceSlugs.workspaceId, before.id),
          notInArray(workspaceSlugs.slug, [before.slug, slug]),
        ),
      );
      return update(workspaces, { name, slug }, eq(workspaces.id, before.id));
    },
  };
}
