import { describe, expect, it } from 'vitest';
import { AUDIT_COLUMNS, tableFacts } from './support/table-metadata';
import { users } from '@/db/schema/users';
import { workspaces, workspaceMembers } from '@/db/schema/workspaces';

// Schema shape via Drizzle's introspection; "migration applies cleanly" is the
// harness's, which migrates the template every clone is made from.
describe('workspaces schema', () => {
  const { byName, indexes } = tableFacts(workspaces);

  it('has DESIGN.md §5 columns: id, name, slug', () => {
    expect(byName.id.primary).toBe(true);
    expect(byName.name.notNull).toBe(true);
    expect(byName.slug.notNull).toBe(true);
  });

  // §5: no `kind` column and no automatic workspace. Pinning the whole set is
  // what reddens a later `kind`/`type`/`personal` column.
  it('carries no column distinguishing one class of workspace from another', () => {
    expect(Object.keys(byName).sort()).toEqual(['id', 'name', 'slug', ...AUDIT_COLUMNS].sort());
  });

  it('makes the slug index partial on deleted_at IS NULL (CLAUDE.md rule 4)', () => {
    const slugIndex = indexes.find((i) =>
      i.config.columns.some((c) => 'name' in c && c.name === 'slug'),
    );
    expect(slugIndex).toBeDefined();
    expect(slugIndex?.config.unique).toBe(true);
    expect(slugIndex?.config.where).toBeDefined();
  });
});

describe('workspace_members schema', () => {
  const { byName, primaryKeys, foreignKeyByColumn } = tableFacts(workspaceMembers);

  it('has DESIGN.md §5 columns: workspaceId, userId, role, joinedAt', () => {
    expect(byName.workspace_id.notNull).toBe(true);
    expect(byName.user_id.notNull).toBe(true);
    expect(byName.role.notNull).toBe(true);
    expect(byName.joined_at.notNull).toBe(true);
  });

  // Declared low to high. Read as documentation: each role carries its own
  // permission statements, and nothing compares two of them.
  it('constrains role to viewer | member | owner', () => {
    expect(byName.role.enumValues).toEqual(['viewer', 'member', 'owner']);
  });

  it('keys on the membership pair, not a surrogate id', () => {
    expect(byName.id).toBeUndefined();
    expect(primaryKeys).toHaveLength(1);
    expect(primaryKeys[0].columns.map((c) => c.name)).toEqual(['workspace_id', 'user_id']);
  });

  it('references workspaces.id and users.id from the pair', () => {
    expect(foreignKeyByColumn.workspace_id.foreignTable).toBe(workspaces);
    expect(foreignKeyByColumn.workspace_id.foreignColumnName).toBe('id');
    expect(foreignKeyByColumn.user_id.foreignTable).toBe(users);
    expect(foreignKeyByColumn.user_id.foreignColumnName).toBe('id');
  });
});
