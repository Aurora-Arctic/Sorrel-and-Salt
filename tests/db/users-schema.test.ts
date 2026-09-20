import { describe, expect, it } from 'vitest';
import { tableFacts } from './support/table-metadata';
import { users } from '@/db/schema/users';

// Schema shape via Drizzle's introspection; the seeded rows are asserted in
// seeded-template.test.ts.
describe('users schema', () => {
  const { byName, indexes } = tableFacts(users);

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

  it('makes the email index partial on deleted_at IS NULL, not a plain unique constraint (CLAUDE.md rule 4)', () => {
    const emailIndex = indexes.find((i) =>
      i.config.columns.some((c) => 'name' in c && c.name === 'email'),
    );
    expect(emailIndex).toBeDefined();
    expect(emailIndex?.config.unique).toBe(true);
    expect(emailIndex?.config.where).toBeDefined();
  });
});
