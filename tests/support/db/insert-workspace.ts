import type postgres from 'postgres';
import { A } from '../as-user';
import { makeWorkspace, workspaceColumns } from '../fixtures/workspace';

// The one way a test seeds a coven it is not testing the writing of, through the raw client rather than
// `withAudit`: the row, its seats and, when asked, its current address (claude-docs/testing/fixture-factories.md,
// "Fixture factories").

type Role = 'owner' | 'member' | 'viewer';
type Sql = postgres.Sql | postgres.TransactionSql;

export interface InsertWorkspaceOptions {
  // Only when a test needs a fixed address; otherwise it comes from the name.
  slug?: string;
  // Whose id stamps every row; A by default.
  author?: string;
  demo?: boolean;
  // Also write the coven's current address into `workspace_slugs`, as the seed and creation do.
  address?: boolean;
}

export async function insertWorkspaceWithSlug(
  sql: Sql,
  name: string,
  members: readonly (readonly [userId: string, role: Role])[] = [[A.id, 'owner']],
  options: InsertWorkspaceOptions = {},
): Promise<{ id: string; slug: string }> {
  const author = options.author ?? A.id;
  const stamps = { created_by: author, updated_by: author };
  const columns = workspaceColumns(
    makeWorkspace(options.slug ? { name, slug: options.slug } : { name }),
  );
  const row = options.demo === undefined ? columns : { ...columns, demo: options.demo };

  const [coven] =
    await sql`insert into workspaces ${sql({ ...row, ...stamps })} returning id, slug`;
  const id = coven!.id as string;
  const slug = coven!.slug as string;

  if (options.address) {
    await sql`insert into workspace_slugs ${sql({ workspace_id: id, slug, ...stamps })}`;
  }
  if (members.length > 0) {
    await addMembers(sql, id, members, author);
  }
  return { id, slug };
}

export async function insertWorkspace(
  sql: Sql,
  name: string,
  members?: readonly (readonly [userId: string, role: Role])[],
  options?: InsertWorkspaceOptions,
): Promise<string> {
  return (await insertWorkspaceWithSlug(sql, name, members, options)).id;
}

export async function addMembers(
  sql: Sql,
  workspaceId: string,
  members: readonly (readonly [userId: string, role: Role])[],
  author: string = A.id,
): Promise<void> {
  const rows = members.map(([userId, role]) => ({
    workspace_id: workspaceId,
    user_id: userId,
    role,
    created_by: author,
    updated_by: author,
  }));
  await sql`insert into workspace_members ${sql(rows)}`;
}
