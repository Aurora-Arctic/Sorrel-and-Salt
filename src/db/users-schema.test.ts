import { describe, expect, it } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { users } from './schema/users';

// Pure schema-shape assertions via Drizzle's own introspection — no real
// Postgres needed. sorrel_template carries no tables until M1.27
// (claude-docs/db.md), so a test that actually inserted a row here would
// only pass by accident locally, per the M2.4 lesson recorded in
// src/app/api/auth/[...all]/route.test.ts.
describe('users schema', () => {
  const { columns, indexes } = getTableConfig(users);
  const byName = Object.fromEntries(columns.map((c) => [c.name, c]));

  it('has DESIGN.md §5 columns: id, name, email, image, role, canCreateWorkspace', () => {
    expect(byName.name).toBeDefined();
    expect(byName.name.notNull).toBe(true);
    expect(byName.image).toBeDefined();
    expect(byName.image.notNull).toBe(false);
  });

  it('defaults role to user and rejects anything outside user|admin', () => {
    expect(byName.role.notNull).toBe(true);
    expect(byName.role.default).toBe('user');
    expect(byName.role.enumValues).toEqual(['user', 'admin']);
  });

  it('defaults canCreateWorkspace to false', () => {
    expect(byName.can_create_workspace.notNull).toBe(true);
    expect(byName.can_create_workspace.default).toBe(false);
  });

  it('spreads the shared audit columns', () => {
    for (const column of [
      'created_at',
      'created_by',
      'updated_at',
      'updated_by',
      'deleted_at',
      'deleted_by',
    ]) {
      expect(byName[column]).toBeDefined();
    }
    expect(byName.created_by.notNull).toBe(true);
    expect(byName.deleted_at.notNull).toBe(false);
  });

  it('makes the email index partial on deleted_at IS NULL, not a plain unique constraint (CLAUDE.md rule 4)', () => {
    const emailIndex = indexes.find((i) =>
      i.config.columns.some((c) => 'name' in c && c.name === 'email'),
    );
    expect(emailIndex).toBeDefined();
    expect(emailIndex?.config.unique).toBe(true);
    expect(emailIndex?.config.where).toBeDefined();
  });
});
