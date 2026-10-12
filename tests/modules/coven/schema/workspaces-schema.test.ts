import { describe, expect, it } from 'vitest';
import { AUDIT_COLUMNS, tableFacts } from '../../../support/db/table-metadata';
import { workspaces, workspaceMembers } from '@/modules/coven/schema/workspaces';

// Schema shape via Drizzle's introspection; that the migrations built the same
// is tests/db/schema-drift.test.ts's.
describe('workspaces schema', () => {
  // §5: no `kind` column and no automatic workspace. Pinning the whole set is
  // what reddens a later `kind`/`type`/`personal` column.
  it('has DESIGN.md §5 columns and nothing else', () => {
    const { byName } = tableFacts(workspaces);

    expect(Object.keys(byName).sort()).toEqual(['id', 'name', 'slug', ...AUDIT_COLUMNS].sort());
  });
});

describe('workspace_members schema', () => {
  const { byName, primaryKeys } = tableFacts(workspaceMembers);

  it('has its own columns and the six audit ones, and nothing else', () => {
    expect(Object.keys(byName).sort()).toEqual(
      ['workspace_id', 'user_id', 'role', 'joined_at', ...AUDIT_COLUMNS].sort(),
    );
  });

  // One membership per user per coven: the pair is the identity.
  it('keys on the membership pair, not a surrogate id', () => {
    expect(primaryKeys.map((key) => key.columns.map((column) => column.name))).toEqual([
      ['workspace_id', 'user_id'],
    ]);
  });
});
