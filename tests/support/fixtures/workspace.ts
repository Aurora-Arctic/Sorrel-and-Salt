import type { workspaceMembers, workspaces } from '@/db/schema/workspaces';
import { slugify } from '@/lib/slugify';
import { A } from '../as-user';
import { type Overrides, mergeFixture, stated } from './merge';

// M1.25 — a coven, and who is in it.
//
// `workspaces` is three columns wide (DESIGN.md §5), so a fixture that stopped
// at the row would be worth less than writing the object out by hand. What it
// is actually for is the pair: the workspace plus the membership every
// authorization test needs beside it, since a workspace nobody belongs to
// denies everyone and proves nothing.

export type WorkspaceMemberFixture = Pick<typeof workspaceMembers.$inferInsert, 'userId' | 'role'>;

/**
 * A workspace, plus its membership. `workspaceId` is absent from the members:
 * it is the workspace they are members *of*, so a fixture that carried it
 * could disagree with itself.
 */
export interface WorkspaceFixture extends Required<
  Pick<typeof workspaces.$inferInsert, 'name' | 'slug'>
> {
  members: WorkspaceMemberFixture[];
}

// Neither W nor X, and not a name anyone would seed. `workspaces_slug_unique`
// reserves both seeded slugs, so a default named after either would be a fixture
// no test could insert — and a plausible coven name is only safe until someone
// seeds it. workspace.test.ts checks it against the seed's own list as a
// backstop.
const DEFAULT_NAME = 'Fixture Coven';

const DEFAULTS: WorkspaceFixture = {
  name: DEFAULT_NAME,
  // Derived, never written down — see `makeWorkspace` below. Stated here as
  // the derivation of the default name for the same reason.
  slug: slugify(DEFAULT_NAME),
  // A owns this one too — A owns W in the fixture cast (CLAUDE.md's Testing
  // section), and the membership is what the fixture is for: an ownerless
  // coven is a shape the application never produces, since story 2 makes the
  // creator its owner and the members page refuses the last owner's demotion.
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
 * **The slug follows the name.** CLAUDE.md's slug rule is that a slug is
 * derived and never written down beside the name it comes from, and a fixture
 * is precisely where a second spelling gets written down — so naming a
 * workspace re-derives its slug through `src/lib/slugify`, the one
 * implementation M3.3's mutation will also use. A slug the caller names is
 * still left alone, which is how a test writes the collision
 * `workspaces_slug_unique` exists to reject.
 */
export function makeWorkspace(overrides: Overrides<WorkspaceFixture> = {}): WorkspaceFixture {
  const workspace = mergeFixture(DEFAULTS, overrides);

  if (stated(overrides, 'name') && !stated(overrides, 'slug')) {
    workspace.slug = slugify(workspace.name);
  }

  return workspace;
}

/**
 * The fixture as an insert into `workspaces` — for the tests that talk to
 * Postgres directly. The membership belongs to another table and is left out;
 * the audit stamps come from the session (CLAUDE.md rule 3).
 */
export function workspaceColumns(fixture: WorkspaceFixture): Record<string, unknown> {
  const { members: _members, ...row } = fixture;
  return { ...row };
}
