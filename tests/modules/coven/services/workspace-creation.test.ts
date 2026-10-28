import { describe, expect, it } from 'vitest';
import { Forbidden } from '@/lib/errors';
import { createWorkspace } from '@/modules/coven';
import { A, D, E, asUser } from '../../../support/as-user';
import { sql, useRawClient } from '../../../support/db/probe-tables';
import { asManualFix } from '../../../support/db/privileges';

useRawClient();

// Creating a workspace (M6.7): gated on the flag alone, the creator written in
// as owner in the same transaction as the workspace, and a slug that stays
// unique however many share a name.

const membersOf = (workspaceId: string) =>
  sql`select user_id, role from workspace_members where workspace_id = ${workspaceId} and deleted_at is null`;

describe('createWorkspace', () => {
  it('makes the creator its only owner, stamped as them', async () => {
    const created = await createWorkspace(asUser(A), { name: 'Fixture Creation Coven' });

    expect(created.slug).toBe('fixture-creation-coven');
    expect(await membersOf(created.id)).toEqual([{ user_id: A.id, role: 'owner' }]);
    const [row] = await sql`select created_by, updated_by from workspaces where id = ${created.id}`;
    expect(row).toEqual({ created_by: A.id, updated_by: A.id });
  });

  it('refuses a user without the flag and writes nothing', async () => {
    await asManualFix(
      sql,
      (tx) => tx`update users set can_create_workspace = false where id = ${D.id}`,
    );
    const [{ can_create_workspace: stillHolds }] = await sql`
      select can_create_workspace from users where id = ${A.id}`;
    // Why D's refusal is the gate's: A, the same seed, holds the right.
    expect(stillHolds).toBe(true);

    await expect(createWorkspace(asUser(D), { name: 'Fixture Refused Hearth' })).rejects.toThrow(
      Forbidden,
    );
    expect(await sql`select id from workspaces where name = 'Fixture Refused Hearth'`).toHaveLength(
      0,
    );
  });

  it('reads the flag as it is now, not as the session was minted', async () => {
    await asManualFix(
      sql,
      (tx) => tx`update users set can_create_workspace = false where id = ${A.id}`,
    );
    // The session still says admin or user as before; only the row changed.
    await expect(createWorkspace(asUser(A), { name: 'Fixture Revoked Coven' })).rejects.toThrow(
      Forbidden,
    );
    // Put back, for the tests after this one: the database is cloned per file.
    await asManualFix(
      sql,
      (tx) => tx`update users set can_create_workspace = true where id = ${A.id}`,
    );
  });

  it('lets an admin through on the flag every admin holds', async () => {
    expect(asUser(E).role).toBe('admin');
    const created = await createWorkspace(asUser(E), { name: 'Fixture Admin Creation Coven' });
    expect(await membersOf(created.id)).toEqual([{ user_id: E.id, role: 'owner' }]);
  });

  it('gives each of two same-named workspaces its own slug, the first keeping the plain one', async () => {
    const first = await createWorkspace(asUser(A), { name: 'Fixture Twin Coven' });
    const second = await createWorkspace(asUser(A), { name: 'Fixture Twin Coven' });
    const third = await createWorkspace(asUser(A), { name: 'Fixture Twin Coven' });

    expect([first.slug, second.slug, third.slug]).toEqual([
      'fixture-twin-coven',
      'fixture-twin-coven-2',
      'fixture-twin-coven-3',
    ]);
  });

  it('keeps the right after creating, so one user may own several', async () => {
    await createWorkspace(asUser(A), { name: 'Fixture First Of Many' });
    await createWorkspace(asUser(A), { name: 'Fixture Second Of Many' });
    const [{ can_create_workspace: held }] = await sql`
      select can_create_workspace from users where id = ${A.id}`;
    expect(held).toBe(true);
    const owned = await sql`
      select workspace_id from workspace_members
      where user_id = ${A.id} and role = 'owner' and deleted_at is null
        and workspace_id in (select id from workspaces where name like 'Fixture % Of Many')`;
    expect(owned).toHaveLength(2);
  });

  it('leaves neither row when the owner write fails', async () => {
    // A user id the foreign key refuses: the workspace row goes in first, then
    // the owner row fails, and the transaction takes the workspace with it.
    const ghost = { ...asUser(A), userId: '00000000-0000-4000-8000-00000000dead' };
    await expect(createWorkspace(ghost, { name: 'Fixture Orphan Coven' })).rejects.toThrow();
    expect(await sql`select id from workspaces where name = 'Fixture Orphan Coven'`).toHaveLength(
      0,
    );
  });
});

describe('createWorkspace and the create page’s address', () => {
  // `/coven/new` is the create page (M9.16), so a coven named "New" takes the
  // next slug along rather than an address no link could ever reach.
  it('never gives a workspace the slug the create page sits at', async () => {
    const first = await createWorkspace(asUser(A), { name: 'New' });
    const second = await createWorkspace(asUser(A), { name: 'New' });

    expect(first.slug).toBe('new-2');
    expect(second.slug).toBe('new-3');
    expect(await sql`select id from workspaces where slug = 'new'`).toHaveLength(0);
  });

  // `?new=spell` and `?new=ingredient` open a dialog without naming a coven (M10.12), so
  // neither word is ever a coven's slug.
  it.each([
    ['Spell', 'spell'],
    ['Ingredient', 'ingredient'],
  ])('never gives a coven named %s the slug %s, a value of ?new', async (name, slug) => {
    const created = await createWorkspace(asUser(A), { name });

    expect(created.slug).toBe(`${slug}-2`);
    expect(await sql`select id from workspaces where slug = ${slug}`).toHaveLength(0);
  });
});
