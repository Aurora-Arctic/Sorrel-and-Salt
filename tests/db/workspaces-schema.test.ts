import { describe, expect, it } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { users } from '@/db/schema/users';
import { workspaces, workspaceMembers } from '@/db/schema/workspaces';

const AUDIT_COLUMNS = [
  'created_at',
  'created_by',
  'updated_at',
  'updated_by',
  'deleted_at',
  'deleted_by',
];

// Pure schema-shape assertions via Drizzle's own introspection, the same
// shape as users-schema.test.ts — sorrel_template carries no tables until
// M1.27 (claude-docs/db.md), so a test that inserted a row here would only
// pass by accident locally. "Migration applies cleanly" is verified by
// running db:migrate against the local database, not from here.
describe('workspaces schema', () => {
  const { columns, indexes } = getTableConfig(workspaces);
  const byName = Object.fromEntries(columns.map((c) => [c.name, c]));

  it('has DESIGN.md §5 columns: id, name, slug', () => {
    expect(byName.id.primary).toBe(true);
    expect(byName.name.notNull).toBe(true);
    expect(byName.slug.notNull).toBe(true);
  });

  // DESIGN.md §5: "There is no `kind` column and no automatically created
  // workspace. Every workspace behaves identically." Pinning the whole column
  // set is what makes that enforceable rather than merely intended — a later
  // `kind`/`type`/`personal` column turns this red.
  it('carries no column distinguishing one class of workspace from another', () => {
    expect(Object.keys(byName).sort()).toEqual(['id', 'name', 'slug', ...AUDIT_COLUMNS].sort());
  });

  it('spreads the shared audit columns', () => {
    for (const column of AUDIT_COLUMNS) {
      expect(byName[column]).toBeDefined();
    }
    expect(byName.created_by.notNull).toBe(true);
    expect(byName.deleted_at.notNull).toBe(false);
  });

  it('makes the slug index partial on deleted_at IS NULL (CLAUDE.md rule 4)', () => {
    const slugIndex = indexes.find((i) =>
      i.config.columns.some((c) => 'name' in c && c.name === 'slug'),
    );
    expect(slugIndex).toBeDefined();
    expect(slugIndex?.config.unique).toBe(true);
    expect(slugIndex?.config.where).toBeDefined();
  });

  it('references users.id from every audit id (MB.5)', () => {
    const { foreignKeys } = getTableConfig(workspaces);
    const byColumn = Object.fromEntries(
      foreignKeys.map((fk) => {
        const { columns: local, foreignColumns, foreignTable } = fk.reference();
        return [local[0].name, { foreignColumnName: foreignColumns[0].name, foreignTable }];
      }),
    );

    for (const column of ['created_by', 'updated_by', 'deleted_by']) {
      expect(byColumn[column]).toBeDefined();
      expect(byColumn[column].foreignColumnName).toBe('id');
      expect(byColumn[column].foreignTable).toBe(users);
    }
  });
});

describe('workspace_members schema', () => {
  const { columns, primaryKeys, foreignKeys } = getTableConfig(workspaceMembers);
  const byName = Object.fromEntries(columns.map((c) => [c.name, c]));

  it('has DESIGN.md §5 columns: workspaceId, userId, role, joinedAt', () => {
    expect(byName.workspace_id.notNull).toBe(true);
    expect(byName.user_id.notNull).toBe(true);
    expect(byName.role.notNull).toBe(true);
    expect(byName.joined_at.notNull).toBe(true);
  });

  // DESIGN.md §5's role table: owner > member > viewer, the ordering M6.3's
  // assertMembership implements.
  it('constrains role to viewer | member | owner', () => {
    expect(byName.role.enumValues).toEqual(['viewer', 'member', 'owner']);
  });

  it('keys on the membership pair, not a surrogate id', () => {
    expect(byName.id).toBeUndefined();
    expect(primaryKeys).toHaveLength(1);
    expect(primaryKeys[0].columns.map((c) => c.name)).toEqual(['workspace_id', 'user_id']);
  });

  it('spreads the shared audit columns', () => {
    for (const column of AUDIT_COLUMNS) {
      expect(byName[column]).toBeDefined();
    }
    expect(byName.created_by.notNull).toBe(true);
    expect(byName.deleted_at.notNull).toBe(false);
  });

  it('references workspaces.id and users.id from the pair', () => {
    const byColumn = Object.fromEntries(
      foreignKeys.map((fk) => {
        const { columns: local, foreignColumns, foreignTable } = fk.reference();
        return [local[0].name, { foreignColumnName: foreignColumns[0].name, foreignTable }];
      }),
    );

    expect(byColumn.workspace_id.foreignTable).toBe(workspaces);
    expect(byColumn.workspace_id.foreignColumnName).toBe('id');
    expect(byColumn.user_id.foreignTable).toBe(users);
    expect(byColumn.user_id.foreignColumnName).toBe('id');
  });
});
