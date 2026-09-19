import type { workspaceMembers, workspaces } from '@/db/schema/workspaces';
import { slugify } from '@/lib/slugify';
import { A } from '../as-user';
import { type Overrides, mergeFixture, stated } from './merge';

// A coven and who is in it. The pair is the point: a workspace nobody belongs
// to denies everyone and proves nothing.

export type WorkspaceMemberFixture = Pick<typeof workspaceMembers.$inferInsert, 'userId' | 'role'>;

/**
 * A workspace plus its membership. `workspaceId` is absent from the members:
 * it is the workspace they are members *of*.
 */
export interface WorkspaceFixture extends Required<
  Pick<typeof workspaces.$inferInsert, 'name' | 'slug'>
> {
  members: WorkspaceMemberFixture[];
}

// Neither W nor X, and invented (CLAUDE.md, Testing); workspace.test.ts checks
// it against the seed.
const DEFAULT_NAME = 'Fixture Coven';

const DEFAULTS: WorkspaceFixture = {
  name: DEFAULT_NAME,
  // Derived, never written beside the name — the slug rule.
  slug: slugify(DEFAULT_NAME),
  // A owns it, as A owns W: an ownerless coven is a shape the application
  // never produces.
  members: [{ userId: A.id, role: 'owner' }],
};

/**
 * One workspace.
 *
 * ```ts
 * makeWorkspace()                                // Fixture Coven, A owning it
 * makeWorkspace({ name: 'Fixture Coven Two' })   // slug follows the name
 * ```
 *
 * The slug is re-derived through `src/lib/slugify` whenever the name is
 * stated — a fixture is exactly where a second spelling would get written
 * down. A stated slug is left alone, which is how a test writes the collision
 * `workspaces_slug_unique` rejects.
 */
export function makeWorkspace(overrides: Overrides<WorkspaceFixture> = {}): WorkspaceFixture {
  const workspace = mergeFixture(DEFAULTS, overrides);

  if (stated(overrides, 'name') && !stated(overrides, 'slug')) {
    workspace.slug = slugify(workspace.name);
  }

  return workspace;
}

/**
 * The fixture as an insert into `workspaces`; members are another table's
 * rows, and the audit stamps are the session's (rule 3).
 */
export function workspaceColumns(fixture: WorkspaceFixture): Record<string, unknown> {
  const { members: _members, ...row } = fixture;
  return { ...row };
}
