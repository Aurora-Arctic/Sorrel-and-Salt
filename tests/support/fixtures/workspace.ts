import { slugify } from '@/lib/slugify';
import { A } from '../as-user';
import { mergeFixture, stated } from './merge';
import type { WorkspaceFixture, Overrides } from './types';

// Neither W nor X, and invented (CLAUDE.md, Testing): a real name is safe only
// until someone seeds it.
const DEFAULT_NAME = 'Fixture Coven';

const DEFAULTS: WorkspaceFixture = {
  name: DEFAULT_NAME,
  // Derived, never written beside the name — the slug rule.
  slug: slugify(DEFAULT_NAME),
  // A owns it, as A owns W: an ownerless coven is a shape the application
  // never produces.
  members: [{ userId: A.id, role: 'owner' }],
};

export function makeWorkspace(overrides: Overrides<WorkspaceFixture> = {}): WorkspaceFixture {
  const workspace = mergeFixture(DEFAULTS, overrides);

  if (stated(overrides, 'name') && !stated(overrides, 'slug')) {
    workspace.slug = slugify(workspace.name);
  }

  return workspace;
}

export function workspaceColumns(fixture: WorkspaceFixture): Record<string, unknown> {
  const { members: _members, ...row } = fixture;
  return { ...row };
}
