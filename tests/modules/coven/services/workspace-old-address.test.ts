import { beforeAll, describe, expect, it } from 'vitest';
import { findWorkspaceRole } from '@/db/repository';
import { CovenMoved, Forbidden } from '@/lib/errors';
import { membershipBySlug, renameWorkspace } from '@/modules/coven';
import { A, C, D, E, asUser } from '../../../support/as-user';
import { sql, useRawClient } from '../../../support/db/probe-tables';
import { makeWorkspace, workspaceColumns } from '../../../support/fixtures';

// An old address answers a member with where the coven is now, and a non-member with the bare refusal an address that
// never existed earns: whether a coven exists, or ever existed, is private to its members.

useRawClient();

const OLD_NAME = 'Fixture Oldname Coven';
const OLD_SLUG = 'fixture-oldname-coven';
const NEW_NAME = 'Fixture Newname Coven';
const NEW_SLUG = 'fixture-newname-coven';

let covenId: string;

beforeAll(async () => {
  const [row] = await sql`
    insert into workspaces ${sql({ ...workspaceColumns(makeWorkspace({ name: OLD_NAME })), created_by: A.id, updated_by: A.id })}
    returning id`;
  covenId = row.id as string;
  await sql`
    insert into workspace_slugs (workspace_id, slug, created_by, updated_by)
    values (${covenId}, ${OLD_SLUG}, ${A.id}, ${A.id})`;
  await sql`
    insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
    values (${covenId}, ${A.id}, 'owner', ${A.id}, ${A.id}), (${covenId}, ${C.id}, 'viewer', ${A.id}, ${A.id})`;
  await renameWorkspace(asUser(A), covenId, { name: NEW_NAME });
});

const failureOf = (promise: Promise<unknown>) => promise.catch((error: unknown) => error);

describe('membershipBySlug at an old address', () => {
  it('admits a member at the current address, as before', async () => {
    const { workspace } = await membershipBySlug(asUser(C), NEW_SLUG);

    expect(workspace.id).toBe(covenId);
  });

  it('tells a member, the least privileged seat among them, where the coven is now', async () => {
    // Precondition: the coven moved, so the old address is no coven's current one.
    expect((await sql`select slug from workspaces where id = ${covenId}`)[0]?.slug).toBe(NEW_SLUG);
    await expect(findWorkspaceRole(C.id, covenId)).resolves.toBe('viewer');

    const moved = await failureOf(membershipBySlug(asUser(C), OLD_SLUG));

    expect(moved).toBeInstanceOf(CovenMoved);
    expect(moved).not.toBeInstanceOf(Forbidden);
    expect((moved as CovenMoved).slug).toBe(NEW_SLUG);
  });

  it.each([
    ['a member of another coven', D],
    ['a site keeper with no seat', E],
  ])('refuses %s with the very refusal an address that never existed earns', async (_who, user) => {
    // Why the caller could have been told: the old address names a live coven, and a member is told where it went.
    await expect(findWorkspaceRole(user.id, covenId)).resolves.toBeUndefined();
    expect(await failureOf(membershipBySlug(asUser(A), OLD_SLUG))).toBeInstanceOf(CovenMoved);

    const stranger = await failureOf(membershipBySlug(asUser(user), OLD_SLUG));
    const unknown = await failureOf(membershipBySlug(asUser(user), 'fixture-never-a-coven'));

    expect(stranger).toBeInstanceOf(Forbidden);
    expect(stranger).not.toBeInstanceOf(CovenMoved);
    expect(stranger).toEqual(unknown);
  });

  it('refuses everyone at an old address once the coven is deleted', async () => {
    const [row] = await sql`
      insert into workspaces ${sql({ ...workspaceColumns(makeWorkspace({ name: 'Fixture Doomed Coven' })), created_by: A.id, updated_by: A.id })}
      returning id`;
    await sql`
      insert into workspace_members (workspace_id, user_id, role, created_by, updated_by)
      values (${row.id}, ${A.id}, 'owner', ${A.id}, ${A.id})`;
    await renameWorkspace(asUser(A), row.id, { name: 'Fixture Doomed Later' });
    expect(await failureOf(membershipBySlug(asUser(A), 'fixture-doomed-coven'))).toBeInstanceOf(
      CovenMoved,
    );
    await sql`update workspaces set deleted_at = now(), deleted_by = ${A.id} where id = ${row.id}`;

    expect(await failureOf(membershipBySlug(asUser(A), 'fixture-doomed-coven'))).toBeInstanceOf(
      Forbidden,
    );
  });
});
